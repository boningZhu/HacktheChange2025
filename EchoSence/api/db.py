from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

engine = create_engine("sqlite:///./urban_echo.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    geohash = Column(String, index=True)
    raw_text = Column(String)
    emotion = Column(String)
    risk_level = Column(Integer)
    topics = Column(JSON)
    toxicity_score = Column(Float)
    sentiment_score = Column(Float)

class GridAgg(Base):
    __tablename__ = "grid_agg"
    key = Column(String, primary_key=True)
    geohash = Column(String, index=True)
    window_start = Column(DateTime)
    window_end = Column(DateTime)
    n = Column(Integer)
    avg_sentiment = Column(Float)
    neg_ratio = Column(Float)
    high_risk = Column(Integer)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True)
    geohash = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    rule_id = Column(String)
    level = Column(Integer)
    payload = Column(JSON)
    delivered = Column(Integer, default=0)

def init_db():
    Base.metadata.create_all(bind=engine)
