"""ai chat: balance, ai_models, chats, chat_messages, balance_transactions

Revision ID: 0011
Revises: 0010
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels = None
depends_on = None

# Себестоимость в Timeweb AI Gateway, ₽ за 1 млн токенов (вход, выход),
# снята из GET /api/v3/cloud-ai/models. Меняется в админке → «Модели ИИ».
DEFAULT_MODELS = [
    ("openai/gpt-5.4-mini", "GPT-5.4 Mini", "Быстрая и недорогая: тексты, письма, вопросы", "101", "608"),
    ("anthropic/claude-sonnet-5", "Claude Sonnet 5", "Тексты, код и рассуждения", "405", "2025"),
    ("anthropic/claude-opus-5-5", "Claude Opus 5.5", "Самая умная Claude для сложных задач", "540", "2700"),
    ("anthropic/claude-haiku-5-5", "Claude Haiku 5.5", "Самая экономичная Claude", "13.5", "67.5"),
    ("openai/gpt-5.5", "GPT-5.5", "Флагман OpenAI: сложные задачи и анализ", "676", "4050"),
    ("openai/gpt-6.1-sol", "GPT-6.1 Sol", "Новое поколение OpenAI", "270", "1350"),
    ("gemini/gemini-3.8-flash", "Gemini 3.8 Flash", "Быстрая модель Google", "101.25", "506.25"),
    ("gemini/gemini-3.1-pro-preview", "Gemini 3.1 Pro", "Мощная модель Google", "270", "1620"),
    ("deepseek/deepseek-flash", "DeepSeek V4.1 Flash", "Очень дешёвая и быстрая", "40.5", "162"),
    ("deepseek/deepseek-v4-pro", "DeepSeek V4 Pro", "Сильная и недорогая", "178.2", "534.6"),
    ("yandex/yandexgpt-pro-5.1", "YandexGPT 5.1 Pro", "Хорошо знает русский язык и Россию", "410", "410"),
    ("yandex/aliceai-llm-latest", "Alice AI", "Модель Алисы от Яндекса", "510", "2030"),
    ("xai/grok-4.7", "Grok 4.7", "Модель xAI", "270", "810"),
    ("moonshot/kimi-k3", "Kimi K3", "Модель Moonshot AI", "405", "2025"),
    ("zai/glm-5.3", "GLM 5.3", "Модель Z.ai", "189", "594"),
]


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("balance", sa.Numeric(14, 4), nullable=False, server_default="0"),
    )

    ai_models = op.create_table(
        "ai_models",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column("input_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("output_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.bulk_insert(
        ai_models,
        [
            {
                "id": mid,
                "name": name,
                "description": desc,
                "input_price": price_in,
                "output_price": price_out,
                "is_active": True,
                "sort_order": i,
            }
            for i, (mid, name, desc, price_in, price_out) in enumerate(DEFAULT_MODELS)
        ],
    )

    op.create_table(
        "chats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_chats_user_id", "chats", ["user_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "chat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chats.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_chat_messages_chat_id", "chat_messages", ["chat_id"])
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])

    op.create_table(
        "balance_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(14, 4), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "payment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("payments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_balance_transactions_user_id", "balance_transactions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_balance_transactions_user_id", table_name="balance_transactions")
    op.drop_table("balance_transactions")
    op.drop_index("ix_chat_messages_user_id", table_name="chat_messages")
    op.drop_index("ix_chat_messages_chat_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chats_user_id", table_name="chats")
    op.drop_table("chats")
    op.drop_table("ai_models")
    op.drop_column("users", "balance")
