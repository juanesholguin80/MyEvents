from fastapi import FastAPI

from app.core.logging import setup_logging
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.events import router as events_router
from app.api.v1.routers.registrations import router as registrations_router
from app.api.v1.routers.sessions import router as sessions_router
from app.api.v1.routers.speakers import router as speakers_router
from app.api.v1.routers.users import router as users_router, profile_router
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.exceptions import AppException

setup_logging()

app = FastAPI(
    title="Mis Eventos API",
    version="1.0.0",
    description=(
        "API para la gestión de eventos, sesiones, ponentes, registro de "
        "asistentes y roles (admin, organizador, asistente)."
    ),
)


@app.exception_handler(AppException)
def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code, "fields": exc.fields},
    )


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    fields = {str(error["loc"][-1]): error["msg"] for error in exc.errors()}

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Error de validación",
            "code": "VALIDATION_ERROR",
            "fields": fields,
        },
    )


app.include_router(auth_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(speakers_router, prefix="/api/v1")
app.include_router(registrations_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(profile_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
