from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

# Generate private key SECP256R1 (prime256v1)
private_key = ec.generate_private_key(ec.SECP256R1())

# Get private key in raw bytes format, base64 urlsafe encoded
private_value = private_key.private_numbers().private_value
private_bytes = private_value.to_bytes(32, 'big')
private_b64 = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')

# Get public key SECP256R1
public_key = private_key.public_key()
# Uncompressed format (X9.62 uncompressed point)
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)
public_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')

print("Public Key B64 (65 bytes uncompressed):", public_b64)
print("Private Key B64 (32 bytes):", private_b64)
