#!/usr/bin/env python
"""
Скрипт для тестирования JWT аутентификации
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_USER = "admin"
ADMIN_PASSWORD = "admin@test.com"

def test_login():
    """Тест логина"""
    print("=" * 60)
    print("TEST 1: LOGIN (Вход в систему)")
    print("=" * 60)
    
    url = f"{BASE_URL}/auth/login/"
    data = {
        "username": ADMIN_USER,
        "password": ADMIN_PASSWORD
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        tokens = response.json()
        return tokens.get('access'), tokens.get('refresh')
    return None, None

def test_current_user(access_token):
    """Тест получения текущего пользователя"""
    print("\n" + "=" * 60)
    print("TEST 2: GET CURRENT USER (Получить текущего пользователя)")
    print("=" * 60)
    
    url = f"{BASE_URL}/auth/me/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_protected_endpoint(access_token):
    """Тест защищённого endpoint-а"""
    print("\n" + "=" * 60)
    print("TEST 3: ACCESS PROTECTED ENDPOINT (Доступ к защищённому endpoint-у)")
    print("=" * 60)
    
    url = f"{BASE_URL}/admins/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)[:500]}...")

def test_without_token():
    """Тест доступа без токена"""
    print("\n" + "=" * 60)
    print("TEST 4: ACCESS WITHOUT TOKEN (Доступ без токена - должен быть запрещён)")
    print("=" * 60)
    
    url = f"{BASE_URL}/admins/"
    
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_refresh_token(refresh_token):
    """Тест обновления токена"""
    print("\n" + "=" * 60)
    print("TEST 5: REFRESH TOKEN (Обновить Access Token)")
    print("=" * 60)
    
    url = f"{BASE_URL}/auth/token/refresh/"
    data = {
        "refresh": refresh_token
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        return response.json().get('access')
    return None

def test_invalid_token():
    """Тест с неверным токеном"""
    print("\n" + "=" * 60)
    print("TEST 6: INVALID TOKEN (Доступ с неверным токеном)")
    print("=" * 60)
    
    url = f"{BASE_URL}/admins/"
    headers = {
        "Authorization": "Bearer invalid_token_here"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_logout(access_token, refresh_token):
    """Тест logout"""
    print("\n" + "=" * 60)
    print("TEST 7: LOGOUT (Выход из системы - инвалидировать token)")
    print("=" * 60)
    
    url = f"{BASE_URL}/auth/logout/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    data = {
        "refresh": refresh_token
    }
    
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def main():
    print("\n")
    print("=" * 60)
    print("JWT AUTHENTICATION TESTING".center(60))
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}".center(60))
    print("=" * 60)
    
    # Test 1: Login
    access_token, refresh_token = test_login()
    
    if not access_token:
        print("\n❌ LOGIN FAILED - Cannot proceed with other tests")
        return
    
    print("\n✅ LOGIN SUCCESSFUL - Got tokens")
    print(f"Access Token: {access_token[:50]}...")
    print(f"Refresh Token: {refresh_token[:50]}...")
    
    # Test 2: Get current user
    test_current_user(access_token)
    
    # Test 3: Access protected endpoint
    test_protected_endpoint(access_token)
    
    # Test 4: Access without token
    test_without_token()
    
    # Test 5: Refresh token
    new_access_token = test_refresh_token(refresh_token)
    
    # Test 6: Invalid token
    test_invalid_token()
    
    # Test 7: Logout
    if new_access_token:
        test_logout(new_access_token, refresh_token)
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()
