"""
Embedding service for semantic search.
Generates and manages vector embeddings for files.
"""

import json
import logging
import numpy as np
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as delete

from ..models.db_models import FileEmbedding, UserSettings
from ..utils.encryption import decrypt_api_key
from ..config import settings as app_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and storing, and searching file embeddings."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._api_key = None
        self._provider = None
        self._embedding_model = None

    async def initialize(self):
        """Initialize the embedding service with user settings."""
        try:
            user_settings = await UserSettings.get_settings(self.db)
            if user_settings:
                self._provider = user_settings.embedding_provider or "openai"
                self._embedding_model = user_settings.embedding_model or "text-embedding-3-small"

                # Get decrypted API key
                if user_settings.api_key_encrypted:
                    encryption_key = app_settings.encryption_key or "default-key"
                    self._api_key = decrypt_api_key(
                        user_settings.api_key_encrypted,
                        encryption_key
                    )
        except Exception as e:
            logger.warning(f"Failed to initialize embedding service: {e}")

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using configured provider."""
        if not self._api_key:
            raise ValueError("API key not configured for embedding generation")

        if not text or not text.strip():
            return []

        try:
            if self._provider == "openai":
                return await self._generate_openai_embedding(text)
            else:
                raise ValueError(f"Unsupported embedding provider: {self._provider}")
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    async def _generate_openai_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API."""
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self._embedding_model,
                    "input": text[:8000],  # Limit text length
                }
            )
            response.raise_for_status()
            result = response.json()

            return result["data"][0]["embedding"]

    async def store_embedding(
        self,
        file_id: str,
        embedding: List[float],
        content_preview: str,
        embedding_model: str
    ) -> FileEmbedding:
        """Store embedding in database."""
        # Check if embedding already exists
        existing = await self.db.execute(
            select(FileEmbedding).where(FileEmbedding.file_id == file_id)
        )
        if existing:
            # Update existing embedding
            existing.embedding = json.dumps(embedding)
            existing.embedding_model = embedding_model
            existing.content_preview = content_preview[:500]  # Truncate preview
            existing.updated_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(existing)
            return existing
        else:
            # Create new embedding
            new_embedding = FileEmbedding(
                file_id=file_id,
                embedding=json.dumps(embedding),
                embedding_model=embedding_model,
                content_preview=content_preview[:500],
            )
            self.db.add(new_embedding)
            await self.db.commit()
            await self.db.refresh(new_embedding)
            return new_embedding

    async def get_embedding(self, file_id: str) -> Optional[FileEmbedding]:
        """Get embedding for a file."""
        result = await self.db.execute(
            select(FileEmbedding).where(FileEmbedding.file_id == file_id)
        )
        return result.scalar_one_or_none()

    async def search_similar(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for files with similar embeddings."""
        # Generate embedding for query
        query_embedding = await self.generate_embedding(query)

        # Get all embeddings from database
        embeddings = await self.db.execute(
            select(FileEmbedding)
        )
        results = embeddings.scalars().all()

        if not results:
            return []

        # Calculate similarities
        similarities = []
        for result in results:
            stored_embedding = json.loads(result.embedding)
            similarity = self._cosine_similarity(query_embedding, stored_embedding)

            if similarity >= threshold:
                similarities.append({
                    "file_id": result.file_id,
                    "similarity": similarity,
                    "content_preview": result.content_preview,
                })

        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return similarities[:limit]

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        a = np.array(a)
        b = np.array(b)

        # Normalize vectors
        a_norm = a / np.linalg.norm(a)
        b_norm = b / np.linalg.norm(b)

        # Calculate cosine similarity
        return np.dot(a_norm, b_norm)

    async def delete_embedding(self, file_id: str):
        """Delete embedding for a file."""
        await self.db.execute(
            delete(FileEmbedding).where(FileEmbedding.file_id == file_id)
        )
        await self.db.commit()

    async def get_embedding_count(self) -> int:
        """Get count of files with embeddings."""
        result = await self.db.execute(
            select(FileEmbedding)
        )
        return len(result.scalars().all())
