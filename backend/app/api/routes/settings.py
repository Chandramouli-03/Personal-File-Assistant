"""
Settings API routes for AI configuration and user preferences.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from openai import OpenAI

from ...database import get_db
from ...models.db_models import UserSettings, AIProvider
from ...config import settings as app_settings
from ...utils.encryption import encrypt_api_key, decrypt_api_key, mask_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


# Pydantic models for request/response
class AISettingsResponse(BaseModel):
    """Response model for AI settings"""
    id: str
    ai_provider: str
    has_api_key: bool
    api_key_masked: Optional[str] = None
    base_url: Optional[str] = None
    nl_search_enabled: bool
    semantic_search_enabled: bool
    content_search_enabled: bool
    model: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AISettingsUpdate(BaseModel):
    """Request model for updating AI settings"""
    ai_provider: Optional[str] = Field(None, description="AI provider: openai, anthropic, glm, or custom")
    api_key: Optional[str] = Field(None, description="API key for selected provider")
    base_url: Optional[str] = Field(None, description="Custom base URL (e.g., https://api.provider.com/v1)")
    model: Optional[str] = Field(None, description="Model name for the provider")
    nl_search_enabled: Optional[bool] = None
    semantic_search_enabled: Optional[bool] = None
    content_search_enabled: Optional[bool] = None


class AIFeaturesResponse(BaseModel):
    """Response model for available AI features"""
    features: List[dict]
    providers: List[dict]
    models: dict


class TestConnectionRequest(BaseModel):
    """Request model for testing API connection"""
    provider: str
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None


class TestConnectionResponse(BaseModel):
    """Response model for API connection test"""
    success: bool
    message: str
    provider: str


# Available models per provider
AVAILABLE_MODELS = {
    "openai": {
        "chat": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "embedding": ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]
    },
    "anthropic": {
        "chat": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
        "embedding": []
    },
    "glm": {
        "chat": ["glm-4", "glm-4-flash", "glm-4-plus", "glm-4-long", "glm-3-turbo"],
        "embedding": []
    },
    "custom": {
        "chat": [],  # User can enter any model name
        "embedding": []
    }
}


# Default base URLs for providers
DEFAULT_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "glm": "https://open.bigmodel.cn/api/paas/v4",
    "custom": ""
}


@router.get("/ai", response_model=AISettingsResponse)
async def get_ai_settings(db: AsyncSession = Depends(get_db)):
    """
    Get current AI settings.

    Returns current AI configuration including provider selection,
    feature flags, and model settings. API key is returned masked for security.
    """
    try:
        user_settings = await UserSettings.get_settings(db)

        # Get masked API key if exists
        api_key_masked = None
        if user_settings.api_key_encrypted:
            encryption_key = app_settings.encryption_key or "default-key"
            try:
                decrypted = decrypt_api_key(user_settings.api_key_encrypted, encryption_key)
                api_key_masked = mask_api_key(decrypted)
            except Exception:
                api_key_masked = "•••••••"

        # Determine model to return based on provider
        model = None
        if user_settings.ai_provider == "openai":
            model = user_settings.openai_model
        elif user_settings.ai_provider == "anthropic":
            model = user_settings.anthropic_model
        elif user_settings.ai_provider == "glm":
            model = user_settings.glm_model
        else:
            model = user_settings.model

        # Get base URL (from settings or default)
        base_url = user_settings.base_url or DEFAULT_BASE_URLS.get(user_settings.ai_provider, "")

        return AISettingsResponse(
            id=user_settings.id,
            ai_provider=user_settings.ai_provider,
            has_api_key=bool(user_settings.api_key_encrypted),
            api_key_masked=api_key_masked,
            base_url=base_url,
            nl_search_enabled=user_settings.nl_search_enabled,
            semantic_search_enabled=user_settings.semantic_search_enabled,
            content_search_enabled=user_settings.content_search_enabled,
            model=model,
            created_at=user_settings.created_at.isoformat() if user_settings.created_at else None,
            updated_at=user_settings.updated_at.isoformat() if user_settings.updated_at else None,
        )
    except Exception as e:
        logger.error(f"Failed to get AI settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {e}")


@router.put("/ai", response_model=AISettingsResponse)
async def update_ai_settings(
    update_data: AISettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update AI settings.

    Updates the AI configuration including provider, API key, base_url, and feature flags.
    The API key is encrypted before storage.
    """
    try:
        update_dict = {}

        # Handle provider update
        if update_data.ai_provider:
            valid_providers = [p.value for p in AIProvider] + ["custom"]
            if update_data.ai_provider not in valid_providers:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid provider. Must be one of: {valid_providers}"
                )
            update_dict["ai_provider"] = update_data.ai_provider

        # Handle API key encryption
        if update_data.api_key is not None:
            encryption_key = app_settings.encryption_key or "default-key"
            if update_data.api_key:
                encrypted_key = encrypt_api_key(update_data.api_key, encryption_key)
                update_dict["api_key_encrypted"] = encrypted_key
            else:
                update_dict["api_key_encrypted"] = None

        # Handle custom base URL
        if update_data.base_url is not None:
            if update_data.base_url.strip():
                update_dict["base_url"] = update_data.base_url.strip()
            else:
                update_dict["base_url"] = None  # Use default

        # Handle model settings
        if update_data.model:
            # Store in provider-specific field or generic field
            if update_data.ai_provider == "openai":
                update_dict["openai_model"] = update_data.model
            elif update_data.ai_provider == "anthropic":
                update_dict["anthropic_model"] = update_data.model
            elif update_data.ai_provider == "glm":
                update_dict["glm_model"] = update_data.model
            else:
                update_dict["model"] = update_data.model

        # Handle feature flags
        if update_data.nl_search_enabled is not None:
            update_dict["nl_search_enabled"] = update_data.nl_search_enabled
        if update_data.semantic_search_enabled is not None:
            update_dict["semantic_search_enabled"] = update_data.semantic_search_enabled
        if update_data.content_search_enabled is not None:
            update_dict["content_search_enabled"] = update_data.content_search_enabled

        # Update settings
        user_settings = await UserSettings.update_settings(db, **update_dict)

        # Return updated settings with masked key
        api_key_masked = None
        if user_settings.api_key_encrypted:
            encryption_key = app_settings.encryption_key or "default-key"
            try:
                decrypted = decrypt_api_key(user_settings.api_key_encrypted, encryption_key)
                api_key_masked = mask_api_key(decrypted)
            except Exception:
                api_key_masked = "•••••••"

        # Determine model to return based on provider
        model = None
        if user_settings.ai_provider == "openai":
            model = user_settings.openai_model
        elif user_settings.ai_provider == "anthropic":
            model = user_settings.anthropic_model
        elif user_settings.ai_provider == "glm":
            model = user_settings.glm_model
        else:
            model = user_settings.model

        # Get base URL
        base_url = user_settings.base_url or DEFAULT_BASE_URLS.get(user_settings.ai_provider, "")

        return AISettingsResponse(
            id=user_settings.id,
            ai_provider=user_settings.ai_provider,
            has_api_key=bool(user_settings.api_key_encrypted),
            api_key_masked=api_key_masked,
            base_url=base_url,
            nl_search_enabled=user_settings.nl_search_enabled,
            semantic_search_enabled=user_settings.semantic_search_enabled,
            content_search_enabled=user_settings.content_search_enabled,
            model=model,
            created_at=user_settings.created_at.isoformat() if user_settings.created_at else None,
            updated_at=user_settings.updated_at.isoformat() if user_settings.updated_at else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update AI settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {e}")


@router.get("/ai/features", response_model=AIFeaturesResponse)
async def get_available_features():
    """
    Get available AI features and supported providers/models.

    Returns information about all available AI features, supported providers,
    and their available models.
    """
    features = [
        {
            "id": "nl_search",
            "name": "Natural Language Search",
            "description": "Convert natural language queries to structured search filters",
            "enabled_by_default": True,
            "requires_api_key": True,
        },
        {
            "id": "semantic_search",
            "name": "Semantic Search",
            "description": "Search files by meaning using vector embeddings",
            "enabled_by_default": False,
            "requires_api_key": True,
            "requires_embeddings": True,
        },
        {
            "id": "content_search",
            "name": "File Content Understanding",
            "description": "Search within file contents (PDF, Word, text files)",
            "enabled_by_default": False,
            "requires_api_key": True,
            "requires_content_extraction": True,
        }
    ]

    providers = [
        {
            "id": "openai",
            "name": "OpenAI",
            "description": "GPT-4 and GPT-3.5 models",
            "requires_api_key": True,
            "supports_embeddings": True,
            "default_base_url": "https://api.openai.com/v1",
            "api_key_url": "https://platform.openai.com/api-keys",
        },
        {
            "id": "anthropic",
            "name": "Anthropic",
            "description": "Claude models",
            "requires_api_key": True,
            "supports_embeddings": False,
            "default_base_url": "https://api.anthropic.com/v1",
            "api_key_url": "https://console.anthropic.com/settings/keys",
        },
        {
            "id": "glm",
            "name": "GLM (Zhipu AI)",
            "description": "Chinese GLM models",
            "requires_api_key": True,
            "supports_embeddings": False,
            "default_base_url": "https://open.bigmodel.cn/api/paas/v4",
            "api_key_url": "https://open.bigmodel.cn/",
        },
        {
            "id": "custom",
            "name": "Custom Provider",
            "description": "Any OpenAI-compatible API provider",
            "requires_api_key": True,
            "supports_embeddings": False,
            "default_base_url": "",
            "api_key_url": "",
        }
    ]

    return AIFeaturesResponse(
        features=features,
        providers=providers,
        models=AVAILABLE_MODELS
    )


@router.post("/ai/test", response_model=TestConnectionResponse)
async def test_api_connection(
    test_data: TestConnectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Test API connection for a provider.

    Validates that the provided API key works with the selected provider.
    Uses OpenAI SDK with custom base_url for OpenAI-compatible APIs.
    """
    try:
        provider = test_data.provider.lower()
        api_key = test_data.api_key

        # Determine base URL
        base_url = test_data.base_url
        if not base_url:
            base_url = DEFAULT_BASE_URLS.get(provider, "")

        # Determine model for testing
        test_model = test_data.model
        if not test_model:
            test_model = AVAILABLE_MODELS.get(provider, {}).get("chat", [])[0] or "gpt-4o-mini"

        # Use OpenAI SDK with custom base_url
        try:
            client = OpenAI(
                api_key=api_key,
                base_url=base_url if base_url else None,
            )

            # Test with a simple chat completion
            client.chat.completions.create(
                model=test_model,
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=10,
            )

            return TestConnectionResponse(
                success=True,
                message=f"Successfully connected to {provider.title()}",
                provider=provider
            )

        except Exception as api_error:
            # Try with httpx fallback for some providers
            import httpx

            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{base_url.rstrip('/')}/chat/completions"
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": test_model,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 10,
                    },
                )

                if response.status_code == 200:
                    return TestConnectionResponse(
                        success=True,
                        message=f"Successfully connected to {provider.title()}",
                        provider=provider
                    )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message=f"{provider.title()} connection failed: {response.text}",
                        provider=provider
                    )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API test failed: {e}")
        return TestConnectionResponse(
            success=False,
            message=f"Test failed: {str(e)}",
            provider=test_data.provider
        )


@router.delete("/ai/key")
async def delete_api_key(db: AsyncSession = Depends(get_db)):
    """
    Delete stored API key.

    Removes encrypted API key from storage.
    """
    try:
        await UserSettings.update_settings(db, api_key_encrypted=None)
        return {"success": True, "message": "API key deleted"}
    except Exception as e:
        logger.error(f"Failed to delete API key: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete API key: {e}")
