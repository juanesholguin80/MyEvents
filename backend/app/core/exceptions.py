class AppException(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, detail: str, *, fields: dict | None = None):
        self.detail = detail
        self.fields = fields
        super().__init__(detail)


class NotFoundError(AppException):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppException):
    status_code = 409
    code = "CONFLICT"


class ForbiddenError(AppException):
    status_code = 403
    code = "FORBIDDEN"


class DomainValidationError(AppException):
    status_code = 422
    code = "VALIDATION_ERROR"
