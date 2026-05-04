"""assign requests to managers

Revision ID: 20260504_000002
Revises: 20260504_000001
Create Date: 2026-05-04 11:30:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260504_000002"
down_revision: str | None = "20260504_000001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tour_requests", sa.Column("manager_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_tour_requests_manager_id"), "tour_requests", ["manager_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tour_requests_manager_id"), table_name="tour_requests")
    op.drop_column("tour_requests", "manager_id")
