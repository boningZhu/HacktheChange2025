from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ReportIn(BaseModel):
    text: str = Field(..., max_length=1000)
    postcodeOrArea: Optional[str] = None
    client_ts: Optional[str] = None

class AIResult(BaseModel):
    emotion: str
    sentiment_score: float
    topics: List[str]
    risk_level: int
    toxicity_score: float

class ReportOut(BaseModel):
    id: str
    ai: AIResult
    reply: dict

class HeatOut(BaseModel):
    geohash: str
    n: int
    avg_sentiment: float
    neg_ratio: float
    high_risk: int

class AlertOut(BaseModel):
    id: str
    geohash: str
    level: int
    rule_id: str
    created_at: datetime
    payload: dict
