from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    PROJECT_NAME: str = 'myevents'
    PROJECT_VERSION: str = '0.0.1'
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    LOG_LEVEL: str = "INFO"
    TEST_DATABASE_URL: str | None = None


settings = Settings()
