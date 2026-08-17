"""
SimulationRun model — a stored record of one breach simulation.

We persist the full SimulationResult as JSONB so a past run can be
replayed in the UI exactly as it was produced, plus a few flat columns
(scenario, risk_score, risk_level) for cheap history listing and sorting.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    canvas_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("canvases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scenario: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)

    # Full serialized SimulationResult for exact replay
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Keycloak sub of whoever ran it
    run_by: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<SimulationRun {self.scenario} risk={self.risk_score}>"
