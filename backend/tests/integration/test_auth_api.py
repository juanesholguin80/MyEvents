from app.core.security import create_refresh_token
from app.models.enums import RoleEnum


def test_register_creates_user_without_leaking_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "nuevo@test.com", "password": "Segura123!", "full_name": "Nuevo Usuario"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "nuevo@test.com"
    assert body["role"] == RoleEnum.ASSISTANT.value
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_email_returns_409(client):
    payload = {"email": "dup@test.com", "password": "Segura123!", "full_name": "Dup"}
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    assert second.json()["code"] == "EMAIL_ALREADY_EXISTS"


def test_login_with_valid_credentials_returns_token_pair(client, make_user):
    make_user(email="login@test.com", password="Secreta123!")

    response = client.post(
        "/api/v1/auth/login", json={"email": "login@test.com", "password": "Secreta123!"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_with_wrong_password_returns_401(client, make_user):
    make_user(email="login2@test.com", password="Secreta123!")

    response = client.post(
        "/api/v1/auth/login", json={"email": "login2@test.com", "password": "Incorrecta"}
    )
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_CREDENTIALS"


def test_login_with_unknown_email_returns_401(client):
    response = client.post(
        "/api/v1/auth/login", json={"email": "no-existe@test.com", "password": "x"}
    )
    assert response.status_code == 401


def test_login_inactive_user_returns_401(client, make_user):
    """Guarda de regresión: Fase 6 descubrió que `login` no verificaba is_active."""
    make_user(email="inactivo@test.com", password="Secreta123!", is_active=False)

    response = client.post(
        "/api/v1/auth/login", json={"email": "inactivo@test.com", "password": "Secreta123!"}
    )
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_CREDENTIALS"


def test_refresh_with_valid_refresh_token_returns_new_access_token(client, make_user):
    make_user(email="refresh@test.com", password="Secreta123!")
    login = client.post(
        "/api/v1/auth/login", json={"email": "refresh@test.com", "password": "Secreta123!"}
    )
    refresh_token = login.json()["refresh_token"]

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_refresh_with_access_token_instead_of_refresh_returns_401(client, make_user):
    make_user(email="refresh2@test.com", password="Secreta123!")
    login = client.post(
        "/api/v1/auth/login", json={"email": "refresh2@test.com", "password": "Secreta123!"}
    )
    access_token = login.json()["access_token"]

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_TOKEN"


def test_refresh_with_garbage_token_returns_401(client):
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "esto-no-es-un-jwt"})
    assert response.status_code == 401


def test_protected_endpoint_without_token_returns_401(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 401


def test_protected_endpoint_with_garbage_token_returns_401(client):
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer esto-no-es-un-jwt"})
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_TOKEN"


def test_protected_endpoint_with_refresh_token_instead_of_access_returns_401(client, make_user):
    user = make_user(email="refresh-as-access@test.com")
    refresh_token = create_refresh_token(subject=str(user.id))

    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_TOKEN"


def test_protected_endpoint_with_token_for_deactivated_user_returns_401(
    client, make_user, auth_header
):
    user = make_user(email="deact-token@test.com")
    headers = auth_header(user)

    user.is_active = False

    response = client.get("/api/v1/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_TOKEN"


def test_refresh_for_deactivated_user_returns_401(client, make_user):
    user = make_user(email="refresh-deact@test.com", password="Secreta123!")
    login = client.post(
        "/api/v1/auth/login", json={"email": "refresh-deact@test.com", "password": "Secreta123!"}
    )
    refresh_token = login.json()["refresh_token"]

    user.is_active = False

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_TOKEN"


def test_protected_endpoint_with_wrong_role_returns_403(client, asistente_user, auth_header):
    response = client.post(
        "/api/v1/events",
        headers=auth_header(asistente_user),
        json={
            "name": "No debería poder crear esto",
            "location": "X",
            "start_date": "2030-01-01T10:00:00",
            "end_date": "2030-01-01T12:00:00",
            "capacity": 10,
        },
    )
    assert response.status_code == 403
    assert response.json()["code"] == "INSUFFICIENT_ROLE"


def test_get_me_returns_current_user(client, organizador_user, auth_header):
    response = client.get("/api/v1/me", headers=auth_header(organizador_user))
    assert response.status_code == 200
    assert response.json()["email"] == organizador_user.email
