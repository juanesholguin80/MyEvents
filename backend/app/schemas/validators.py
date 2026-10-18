from datetime import datetime, timezone


def ensure_aware_utc(value: datetime) -> datetime:
    """Si el datetime no trae zona horaria, se asume UTC.

    Necesario porque las columnas de BD son `DateTime(timezone=True)` (siempre
    aware); sin esto, un cliente que mande un datetime sin offset rompe las
    comparaciones `<`/`>`/`>=` entre valores del cliente y valores de la BD
    con un TypeError no manejado (naive vs. aware).
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
