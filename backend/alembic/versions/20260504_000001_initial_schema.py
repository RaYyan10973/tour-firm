"""initial schema

Revision ID: 20260504_000001
Revises:
Create Date: 2026-05-04 00:10:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260504_000001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

role_enum = sa.Enum("CLIENT", "MANAGER", "ADMIN", name="role")
order_status_enum = sa.Enum(
    "IN_WORK",
    "PENDING_PAYMENT",
    "PAID",
    "BOOKED",
    "COMPLETED",
    "CANCELLED",
    name="orderstatus",
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "tour_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("destination", sa.String(length=255), nullable=False),
        sa.Column("travel_dates", sa.String(length=255), nullable=False),
        sa.Column("travelers_count", sa.Integer(), nullable=False),
        sa.Column("budget", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tour_requests_client_id"), "tour_requests", ["client_id"], unique=False)
    op.create_index(op.f("ix_tour_requests_id"), "tour_requests", ["id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_recipient_id"), "notifications", ["recipient_id"], unique=False)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("manager_id", sa.Integer(), nullable=False),
        sa.Column("hotel_name", sa.String(length=255), nullable=False),
        sa.Column("hotel_category", sa.String(length=50), nullable=False),
        sa.Column("weekly_cost", sa.Float(), nullable=False),
        sa.Column("status", order_status_enum, nullable=False),
        sa.Column("status_updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["tour_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index(op.f("ix_orders_id"), "orders", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_orders_id"), table_name="orders")
    op.drop_table("orders")

    op.drop_index(op.f("ix_notifications_recipient_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")

    op.drop_index(op.f("ix_tour_requests_id"), table_name="tour_requests")
    op.drop_index(op.f("ix_tour_requests_client_id"), table_name="tour_requests")
    op.drop_table("tour_requests")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    role_enum.drop(op.get_bind(), checkfirst=True)
    order_status_enum.drop(op.get_bind(), checkfirst=True)
