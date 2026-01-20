"""
Lightweight end-to-end encryption utilities for paid users
Handles decryption of uploaded audio files and encryption of transcription outputs
"""

import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from typing import Tuple


def decrypt_file(encrypted_data: bytes, key_b64: str, iv_b64: str) -> bytes:
    """
    Decrypt data using AES-256-GCM
    
    Args:
        encrypted_data: The encrypted file data
        key_b64: Base64-encoded encryption key
        iv_b64: Base64-encoded initialization vector
        
    Returns:
        Decrypted data as bytes
    """
    # Decode base64 key and IV
    key = base64.b64decode(key_b64)
    iv = base64.b64decode(iv_b64)
    
    # AES-GCM decryption
    # GCM mode includes authentication, so we need to extract the tag (last 16 bytes)
    tag = encrypted_data[-16:]
    ciphertext = encrypted_data[:-16]
    
    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(iv, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    
    decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()
    return decrypted_data


def encrypt_file(data: bytes, key_b64: str, iv_b64: str) -> bytes:
    """
    Encrypt data using AES-256-GCM
    
    Args:
        data: The data to encrypt
        key_b64: Base64-encoded encryption key
        iv_b64: Base64-encoded initialization vector
        
    Returns:
        Encrypted data with authentication tag appended
    """
    # Decode base64 key and IV
    key = base64.b64decode(key_b64)
    iv = base64.b64decode(iv_b64)
    
    # AES-GCM encryption
    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    
    ciphertext = encryptor.update(data) + encryptor.finalize()
    # Append authentication tag (required for GCM)
    return ciphertext + encryptor.tag


def generate_encryption_key() -> Tuple[str, str]:
    """
    Generate a new AES-256 key and IV for encryption
    
    Returns:
        Tuple of (key_b64, iv_b64) as base64-encoded strings
    """
    import os
    key = os.urandom(32)  # 256 bits
    iv = os.urandom(12)   # 96 bits for GCM
    
    return base64.b64encode(key).decode('utf-8'), base64.b64encode(iv).decode('utf-8')
