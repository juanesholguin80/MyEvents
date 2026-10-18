# Mis Eventos

Aplicación full stack para la gestión de eventos, desarrollada como prueba técnica para Tusdatos.co (vacante Desarrollador Backend).

Este repositorio contiene backend y frontend en carpetas separadas, cada una con su propio README con instrucciones detalladas de configuración, ejecución y pruebas:

- [`backend/`](backend/README.md) — API REST (FastAPI + SQLModel + PostgreSQL)
- [`frontend/`](frontend/README.md) — SPA (React + TypeScript)

## Cómo levantar el proyecto

Hay un único `docker-compose.yml`, en la raíz del repositorio, que orquesta los tres servicios pedidos por el enunciado (base de datos, backend y frontend):

```bash
docker compose up --build
```

Esto expone el frontend en `http://localhost` (que internamente llama al backend a través de Nginx) y el backend directamente en `http://localhost:8000` (Swagger en `http://localhost:8000/docs`). Las migraciones de base de datos se aplican automáticamente al arrancar — no se necesita ningún paso manual.

**Alternativa — solo backend** (API + Postgres, sin frontend, útil para desarrollo/pruebas de la API), con el mismo archivo pero indicando qué servicios levantar:

```bash
docker compose up --build backend db
```

Ver el README de cada carpeta para detalles de variables de entorno, datos de ejemplo (seed), tests y cobertura.
