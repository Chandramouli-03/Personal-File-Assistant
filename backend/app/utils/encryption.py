"""
Encryption utilities for securing API keys and sensitive data.
Uses Fernet symmetric encryption from the cryptography library.
"""

import base64
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy import to avoid startup errors if cryptography not installed
_fernet = None


def _get_fernet():
    """Get or create Fernet instance (lazy loading)"""
    global _fernet
    if _fernet is None:
        try:
            from cryptography.fernet import Fernet
            _fernet = Fernet
        except ImportError:
            logger.warning("cryptography library not installed. API key encryption disabled.")
            _fernet = False
    return _fernet if _fernet else None


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.

    Returns:
        str: Base64-encoded encryption key
    """
    Fernet = _get_fernet()
    if Fernet is None:
        raise RuntimeError("cryptography library not installed")

    return Fernet.generate_key().decode('utf-8')


def derive_key_from_password(password: str, salt: str = "personal-assistant") -> bytes:
    """
    Derive a Fernet-compatible key from a password.

    Args:
        password: User password or secret
        salt: Salt for key derivation

    Returns:
        bytes: Fernet-compatible key
    """
    # Use SHA256 to derive a 32-byte key, then base64 encode for Fernet
    combined = f"{password}:{salt}"
    key_hash = hashlib.sha256(combined.encode()).digest()
    return base64.urlsafe_b64encode(key_hash)


def encrypt_api_key(api_key: str, encryption_key: str) -> str:
    """
    Encrypt an API key using Fernet symmetric encryption.

    Args:
        api_key: The API key to encrypt
        encryption_key: The Fernet encryption key

    Returns:
        str: Encrypted API key (base64 encoded)

    Raises:
        ValueError: If encryption_key is empty or invalid
        RuntimeError: If cryptography library is not installed
    """
    if not api_key:
        return ""

    Fernet = _get_fernet()
    if Fernet is None:
        # Fallback: store unencrypted (not recommended for production)
        logger.warning("Storing API key without encryption - cryptography not installed")
        return base64.b64encode(api_key.encode()).decode()

    if not encryption_key:
        raise ValueError("Encryption key is required for API key encryption")

    try:
        # Ensure key is in correct format
        if len(encryption_key) < 32:
            # Derive a proper key if the provided one is too short
            key_bytes = derive_key_from_password(encryption_key)
        else:
            key_bytes = encryption_key.encode() if isinstance(encryption_key, str) else encryption_key

        fernet = Fernet(key_bytes)
        encrypted = fernet.encrypt(api_key.encode())
        return encrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encrypt API key: {e}")
        raise ValueError(f"Encryption failed: {e}")


def decrypt_api_key(encrypted_key: str, encryption_key: str) -> str:
    """
    Decrypt an API key using Fernet symmetric encryption.

    Args:
        encrypted_key: The encrypted API key
        encryption_key: The Fernet encryption key

    Returns:
        str: Decrypted API key

    Raises:
        ValueError: If decryption fails or key is invalid
        RuntimeError: If cryptography library is not installed
    """
    if not encrypted_key:
        return ""

    Fernet = _get_fernet()
    if Fernet is None:
        # Fallback: try base64 decode (unencrypted storage)
        try:
            return base64.b64decode(encrypted_key).decode()
        except Exception:
            return encrypted_key

    if not encryption_key:
        raise ValueError("Encryption key is required for API key decryption")

    try:
        # Ensure key is in correct format
        if len(encryption_key) < 32:
            key_bytes = derive_key_from_password(encryption_key)
        else:
            key_bytes = encryption_key.encode() if isinstance(encryption_key, str) else encryption_key

        fernet = Fernet(key_bytes)
        decrypted = fernet.decrypt(encrypted_key.encode())
        return decrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to decrypt API key: {e}")
        raise ValueError(f"Decryption failed: {e}")


def is_encrypted(value: str) -> bool:
    """
    Check if a value appears to be Fernet-encrypted.

    Args:
        value: String to check

    Returns:
        bool: True if the value appears to be encrypted
    """
    if not value:
        return False

    # Fernet tokens start with specific bytes and are base64 encoded
    try:
        decoded = base64.urlsafe_b64decode(value[:44] + '==')  # First 44 chars for Fernet version check
        return len(decoded) > 0 and decoded[0:1] == b'\x80'  # Fernet version byte
    except Exception:
        return False


def mask_api_key(api_key: str, visible_chars: int = 4) -> str:
    """
    Mask an API key for display purposes.

    Args:
        api_key: The API key to mask
        visible_chars: Number of characters to show at the end

    Returns:
        str: Masked API key (e.g., "••••••••abcd")
    """
    if not api_key:
        return ""

    if len(api_key) <= visible_chars:
        return "••••"

    return "••••••••" + api_key[-visible_chars:]
