from app.auth import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_and_verify_password_roundtrip():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_encode_decode_roundtrip():
    token = create_access_token("someone")
    assert isinstance(token, str)
    assert decode_access_token(token) == "someone"

