"""创建 leads 表（唯一的持久化表，spec §8.1）

Revision ID: 0001
Revises:
Create Date: 2026-08-25
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Text(), primary_key=True, comment="ULID，前缀 ld_"),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("company", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("intent", sa.Text(), nullable=False, comment="demo|consult|trial|partner|career"),
        sa.Column("product", sa.Text(), nullable=True,
                  comment="aragonteam|inkclaw|legallens|platform"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("consent", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("source_path", sa.Text(), nullable=True),
        sa.Column("utm", sa.Text(), nullable=True, comment="JSON 字符串"),
        # 合规：不存明文 IP
        sa.Column("ip_hash", sa.Text(), nullable=True, comment="sha256(ip + SECRET_SALT)"),
        sa.Column("contact_hash", sa.Text(), nullable=False, server_default=sa.text("''"),
                  comment="sha256(手机号或邮箱 + SALT)，供 L2 配额与 L4 幂等使用"),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("request_id", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'new'"),
                  comment="new|contacted|qualified|closed"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="ISO8601 +08:00"),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_leads_created_at", "leads", [sa.text("created_at DESC")])
    op.create_index("ix_leads_intent", "leads", ["intent"])
    op.create_index("ix_leads_status", "leads", ["status"])
    # L2 配额与 L4 幂等的复合查询路径
    op.create_index("ix_leads_contact_created", "leads", ["contact_hash", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_leads_contact_created", table_name="leads")
    op.drop_index("ix_leads_status", table_name="leads")
    op.drop_index("ix_leads_intent", table_name="leads")
    op.drop_index("ix_leads_created_at", table_name="leads")
    op.drop_table("leads")
