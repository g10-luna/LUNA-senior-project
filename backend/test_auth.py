#!/usr/bin/env python3
"""Quick test script for auth register/login - prints raw response."""
import requests

BASE = "http://localhost:8001"

def test_register():
    r = requests.post(f"{BASE}/api/v1/auth/register", json={
        "email": "test@lunadev.com",
        "password": "SecurePass123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "STUDENT"
    })
    print("Status:", r.status_code)
    print("Response (raw):", r.text[:500] if r.text else "(empty)")
    if r.status_code == 200 and r.text:
        try:
            print("Response (parsed):", r.json())
        except Exception:
            pass
    return r

if __name__ == "__main__":
    test_register()
