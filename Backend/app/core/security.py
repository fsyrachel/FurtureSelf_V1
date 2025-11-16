import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

# 1. 对 ENCRYPTION_KEY 做一次 SHA-256，得到 32 字节原始密钥
raw_key = hashlib.sha256(settings.ENCRYPTION_KEY.encode("utf-8")).digest()  # 32 bytes

# 2. 按 Fernet 要求做 URL-safe Base64 编码
fernet_key = base64.urlsafe_b64encode(raw_key)

# 3. 创建 Fernet 实例
cipher_suite = Fernet(fernet_key)


def encrypt_data(data: str) -> str:
    if not data:
        return data
    return cipher_suite.encrypt(data.encode("utf-8")).decode("utf-8")


def decrypt_data(encrypted_data: str) -> str:
    if not encrypted_data:
        return encrypted_data
    return cipher_suite.decrypt(encrypted_data.encode("utf-8")).decode("utf-8")