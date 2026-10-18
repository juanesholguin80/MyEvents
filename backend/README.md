# MyEvents Backend

API REST para gestión de eventos ("Mis Eventos"), construida con FastAPI. Prueba técnica para Tusdatos — alcance: backend.

## Stack

- **FastAPI** + **Uvicorn**
- **SQLModel** (sobre SQLAlchemy 2.0) + **PostgreSQL** (driver `psycopg2`)
- **Alembic** para migraciones
- **JWT** (`python-jose`) con hashing de contraseñas vía **Passlib (Argon2)**
- **Pytest** + **pytest-cov** para tests unitarios/integración y cobertura
- **Poetry** para gestión de dependencias
- **Docker / docker-compose**

## Requisitos previos

- Docker y Docker Compose (forma recomendada de levantar todo el stack: API + Postgres).
- Python 3.12+ y Poetry — solo necesarios si vas a correr el backend o los tests **fuera** de Docker, directo en el host.

## Setup

1. Copia el archivo de variables de entorno y ajusta los valores si lo necesitas (los defaults ya funcionan para desarrollo local):

   ```bash
   cp .env.example .env
   ```

2. Levanta el stack completo (API + Postgres):

   ```bash
   docker-compose up --build
   ```

   Esto levanta tres servicios: `backend` (puerto `8000`), `db` (Postgres, puerto `5432`, para desarrollo) y `db_test` (Postgres, puerto `5433`, solo para la suite de tests — ver [Tests](#tests-y-cobertura)). El `backend` espera a que `db` esté `healthy` antes de arrancar.

3. Aplica las migraciones (la base de datos arranca vacía):

   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. Verifica que la API responde:

   ```bash
   curl http://localhost:8000/health
   # {"status": "ok"}
   ```

### Alternativa: correr el backend en el host (sin Docker)

```bash
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

Para esto necesitas una instancia de Postgres accesible y `DATABASE_URL` apuntando a ella usando `localhost` (no `db`) como host — ver la nota sobre `DATABASE_URL` en la sección de variables de entorno.

## Datos de ejemplo (seed)

El seed crea un usuario por cada rol (admin, organizador, asistente), un ponente, un evento publicado con una sesión, y una inscripción confirmada. Es **idempotente**: si ya corrió antes (detecta al usuario admin existente), no inserta nada de nuevo.

```bash
poetry run python -m scripts.seed
```

> Se ejecuta con `poetry run` (contra Postgres expuesto en `localhost:5432`), no dentro del contenedor: la imagen de `backend` solo empaqueta `app/`, no `scripts/`. Asegúrate de que `DATABASE_URL` en tu `.env` use `localhost` si vas a correrlo así; si tu `.env` tiene `@db:5432` (el valor que usa `docker-compose` para el contenedor), expórtalo puntualmente: `DATABASE_URL="postgresql+psycopg2://myevents:myevents@localhost:5432/myevents" poetry run python -m scripts.seed`.

Credenciales creadas por el seed:

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@miseventos.com` | `Admin123!` |
| Organizador | `organizador@miseventos.com` | `Organizador123!` |
| Asistente | `asistente@miseventos.com` | `Asistente123!` |

## Migraciones

```bash
poetry run alembic upgrade head
```

Para generar una nueva migración a partir de cambios en los modelos:

```bash
poetry run alembic revision --autogenerate -m "descripcion"
```

## Tests y cobertura

Los tests corren contra una base de datos Postgres real y **separada** de la de desarrollo: el servicio `db_test` de `docker-compose.yml` (puerto `5433`, almacenamiento `tmpfs` — se descarta al apagar el contenedor). Esto evita mezclar datos de test con los ~40+ registros acumulados manualmente en la base de desarrollo durante la implementación.

```bash
# Levanta solo la base de test si no está corriendo
docker compose up -d db_test

poetry run pytest
```

Con reporte de cobertura (debe correr sobre `app/`, no sobre `app/` + `tests/`):

```bash
poetry run pytest --cov=app --cov-report=term-missing
# o, para un reporte HTML navegable en htmlcov/index.html:
poetry run pytest --cov=app --cov-report=html
```

Estado actual: 143 tests (50 unitarios + 93 de integración), **99% de cobertura de línea** sobre `app/` (1042 statements, 2 sin cubrir — el cuerpo de `app/db/session.py::get_session()`, la dependencia real de FastAPI que abre una sesión por request en producción; los tests la sustituyen con `dependency_overrides` para compartir una única transacción de test, así que esa función nunca se invoca directamente desde la suite. Sí se ejerce al correr la app real con `docker-compose up`).

## Linting y pre-commit

El proyecto usa `flake8` (configuración en `.flake8`, excluye `.venv`/`alembic`) como único linter.

```bash
poetry run flake8 app/ scripts/ tests/
```

Hay un hook de **pre-commit** configurado (`.pre-commit-config.yaml`) que corre `flake8` automáticamente antes de cada `git commit`, así que un commit con errores de lint no se puede crear. Para activarlo en un clon nuevo del repo:

```bash
poetry install
poetry run pre-commit install
```

Esto instala el hook en `.git/hooks/pre-commit`. No es necesario volver a instalarlo salvo que se clone el repo de nuevo (es un paso de setup local, no algo versionado).

## Documentación de la API

Con el servidor corriendo:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Esquema OpenAPI crudo: `http://localhost:8000/openapi.json`

Todas las rutas protegidas devuelven `401` si falta o expiró el token, y `403` si el rol autenticado no tiene permiso. Las respuestas de error siguen siempre el esquema `{"detail": "...", "code": "ALGO_NOT_FOUND", "fields": null}`.

## Variables de entorno

Copia `.env.example` a `.env` y ajusta según el entorno. Todas están documentadas inline en `.env.example`; resumen:

| Variable | Usada por | Descripción |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | servicio `db` (docker-compose) | Credenciales con las que Postgres se inicializa en el contenedor de desarrollo. |
| `TEST_POSTGRES_USER` / `TEST_POSTGRES_PASSWORD` / `TEST_POSTGRES_DB` | servicio `db_test` (docker-compose) | Análogas a las de arriba, pero para inicializar el contenedor de Postgres de test. |
| `DATABASE_URL` | `app/core/config.py` → `app/db/session.py` | Cadena de conexión SQLAlchemy a Postgres. **El host cambia según dónde corras el backend:** `db` si corre dentro de `docker-compose` (resuelve por nombre de servicio en la red interna), `localhost` si corre en el host (Poetry, `alembic`, `scripts/seed.py`). |
| `JWT_SECRET_KEY` | `app/core/security.py` | Secreto para firmar los JWT. Genera uno real con `openssl rand -hex 32` fuera de desarrollo local. |
| `JWT_ALGORITHM` | `app/core/security.py` | Algoritmo de firma (`HS256`, simétrico). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `app/core/security.py` | Minutos de vida del access token. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `app/core/security.py` | Días de vida del refresh token. |
| `LOG_LEVEL` | `app/core/logging.py` | Nivel de logging (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`). Default `INFO` si se omite. |
| `TEST_DATABASE_URL` | `tests/conftest.py` (pytest) | Conexión a la base de datos de **test** (servicio `db_test`, puerto `5433`). Nunca la usa la app en ejecución, solo la suite de tests. |
| `PROJECT_NAME` / `PROJECT_VERSION` | metadata OpenAPI (`app/main.py`) | Opcionales, tienen default en `Settings`. |

## Estructura del proyecto

```
app/
├── api/v1/        # Routers y endpoints (y las dependencias HTTP-aware: auth, RBAC)
├── core/          # Configuración, seguridad (JWT/hash), logging, jerarquía de excepciones
├── db/            # Sesión y engine de SQLAlchemy
├── models/        # Modelos SQLModel
├── repositories/  # Acceso a datos
├── schemas/       # Esquemas Pydantic (entrada/salida)
└── services/      # Lógica de negocio (sin dependencia de FastAPI/HTTP)
alembic/           # Migraciones
scripts/           # Scripts de operación (seed de datos)
tests/
├── unit/          # Tests unitarios (mocks, sin BD)
└── integration/   # Tests de integración (Postgres real vía db_test)
```

## Checklist de entregables (contra el enunciado original)

- [x] Repositorio con `backend/` separado y README propio (este archivo).
- [x] Documentación API vía Swagger/OpenAPI (`/docs`, `/redoc`).
- [x] Dockerfile backend + `docker-compose.yml` orquestando backend y base de datos.
- [x] Tests unitarios (pytest) + reporte de cobertura (143 tests, 99% de cobertura).
- [x] CRUD de eventos con búsqueda por nombre/parte del nombre, estados y validaciones de negocio.
- [x] Registro/login de usuarios, rutas protegidas (JWT access + refresh).
- [x] Programación de sesiones con ponentes, validación de horarios y capacidad.
- [x] Registro de asistentes a eventos con control de capacidad (concurrencia verificada).
- [x] (Bonus) Roles Admin/Organizador/Asistente con permisos por rol (RBAC).
- [x] (Bonus) Gestión de perfiles por parte del administrador (`/api/v1/admin/users`).
