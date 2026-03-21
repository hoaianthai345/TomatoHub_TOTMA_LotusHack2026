from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

TransparencyLogType = Literal["summary", "ledger", "distribution", "evidence"]


class TransparencyLogRead(BaseModel):
    id: str
    campaign_id: UUID
    type: TransparencyLogType
    title: str
    description: str
    created_at: datetime
