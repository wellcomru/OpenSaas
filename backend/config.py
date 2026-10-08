"""Глобальные настройки приложения.

Все настройки читаются из .env через pydantic-settings.
Redis опционален: если REDIS_URL пустой — модули используют
PostgreSQL fallback (см. modules/rate_limit/service.py).
"""
from __future__ import annotations

from decimal import Decimal
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Дефолтные значения, которые НЕ должны попасть в production —
# проверка выполняется в Settings.validate_production_defaults().
_INSECURE_SECRET_KEY = "change-me-in-production-this-must-be-at-least-32-chars"
_INSECURE_ADMIN_PASSWORD = "change_in_production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # === Database ===
    database_url: str = Field(
        default="postgresql+asyncpg://opensaas:password@localhost:5432/opensaas_db"
    )

    # === Redis (опционально) ===
    redis_url: str = Field(default="")

    # === JWT ===
    secret_key: str = Field(default=_INSECURE_SECRET_KEY)
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=30)

    # === Admin ===
    admin_email: str = Field(default="admin@example.com")
    admin_password: str = Field(default=_INSECURE_ADMIN_PASSWORD)

    # === SMTP ===
    smtp_host: str = Field(default="smtp.gmail.com")
    smtp_port: int = Field(default=587)
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    smtp_from_email: str = Field(default="noreply@example.com")
    smtp_from_name: str = Field(default="OpenSaaS")
    smtp_use_tls: bool = Field(default=True)

    # === ALTCHA (защита регистрации от ботов, без внешних сервисов) ===
    altcha_enabled: bool = Field(default=True)
    # Сложность задачи: браузер перебирает в среднем половину диапазона (~0.5 с).
    altcha_max_number: int = Field(default=100_000)

    # === Робокасса ===
    robokassa_merchant_login: str = Field(default="")
    robokassa_password1: str = Field(default="")
    robokassa_password2: str = Field(default="")
    # Только боевой режим: тестовые пароли Робокассы в проекте не используются.
    robokassa_test_mode: bool = Field(default=False)

    # === Stripe ===
    stripe_secret_key: str = Field(default="")
    stripe_webhook_secret: str = Field(default="")
    stripe_enabled: bool = Field(default=False)

    # === App ===
    app_name: str = Field(default="OpenSaaS")
    # Пусто = брать адрес сайта из заголовка Host запроса (см. public_url.py).
    app_url: str = Field(default="")
    api_url: str = Field(default="http://localhost:8000")
    environment: str = Field(default="development")
    cors_origins: str = Field(default="http://localhost:3000")

    # === Бизнес-логика ===
    # Процент рефереру с каждого пополнения. Наценка на ИИ 25%, поэтому
    # большой процент съест всю прибыль.
    referral_commission_percent: int = Field(default=5)

    # === Баланс ===
    # Бонус на баланс при регистрации, ₽ (0 = без бонуса).
    welcome_bonus: Decimal = Field(default=Decimal("0"))
    topup_min_amount: Decimal = Field(default=Decimal("100"))
    topup_max_amount: Decimal = Field(default=Decimal("100000"))

    # === AI Gateway (OpenAI-совместимый API, по умолчанию Timeweb) ===
    ai_gateway_url: str = Field(default="https://api.timeweb.ai/v1")
    ai_gateway_key: str = Field(default="")
    # Наценка к себестоимости токенов, %.
    ai_markup_percent: Decimal = Field(default=Decimal("25"))
    # Модель по умолчанию для нового чата.
    ai_default_model: str = Field(default="openai/gpt-5.4-mini")
    # Сколько последних сообщений чата отправлять модели как контекст.
    ai_context_messages: int = Field(default=30)
    # Потолок длины одного ответа, токенов.
    ai_max_output_tokens: int = Field(default=8000)
    ai_system_prompt: str = Field(
        default=(
            "Ты полезный ИИ-ассистент. Отвечай на языке пользователя, "
            "по делу и понятно. Используй Markdown для списков, таблиц и кода."
        )
    )

    @model_validator(mode="after")
    def validate_production_defaults(self) -> "Settings":
        """В production запрещаем небезопасные дефолты и короткий secret_key."""
        if self.environment.lower() != "production":
            return self

        errors: list[str] = []
        if self.secret_key == _INSECURE_SECRET_KEY:
            errors.append("SECRET_KEY must be overridden in production")
        if len(self.secret_key) < 32:
            errors.append("SECRET_KEY must be at least 32 characters")
        if self.admin_password == _INSECURE_ADMIN_PASSWORD:
            errors.append("ADMIN_PASSWORD must be overridden in production")
        if "*" in self.cors_origins:
            errors.append("CORS_ORIGINS must not contain '*' in production")

        if errors:
            raise ValueError("Insecure production configuration: " + "; ".join(errors))
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def email_enabled(self) -> bool:
        """Почта настроена: включаются подтверждение email и сброс пароля."""
        return bool(self.smtp_user and self.smtp_password)

    @property
    def redis_enabled(self) -> bool:
        return bool(self.redis_url)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.ai_gateway_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
