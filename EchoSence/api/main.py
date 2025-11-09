# api/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from datetime import datetime, timedelta
from threading import Thread, Event
import random

from .schemas import ReportIn, ReportOut, AIResult, HeatOut, AlertOut
from .db import init_db, SessionLocal, Report, Alert
from .ai import analyze, area_to_geohash

app = FastAPI(title="Urban Echo API")

# ⚠️ Hackathon-simple CORS (allow everything). Tighten later if you want.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # or put your 5500 URL here to be strict
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# ---- Health & root ----
@app.get("/api/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat()}

@app.get("/")
def root():
    return {"detail": "Urban Echo API. See /docs"}

# ---- Create report ----
@app.post("/api/reports", response_model=ReportOut)
def create_report(payload: ReportIn):
    if not payload.text or len(payload.text) > 1000:
        raise HTTPException(400, "text is required and must be <=1000 chars")

    ai = analyze(payload.text)
    gh = area_to_geohash(payload.postcodeOrArea)

    db = SessionLocal()
    rid = str(uuid4())
    try:
        db.add(Report(
            id=rid,
            geohash=gh,
            raw_text=ai["clean_text"],
            emotion=ai["emotion"],
            risk_level=ai["risk_level"],
            topics=ai["topics"],
            toxicity_score=ai["toxicity_score"],
            sentiment_score=ai["sentiment_score"],
        ))
        db.commit()
    finally:
        db.close()

    return ReportOut(
        id=rid,
        ai=AIResult(
            emotion=ai["emotion"],
            sentiment_score=ai["sentiment_score"],
            topics=ai["topics"],
            risk_level=ai["risk_level"],
            toxicity_score=ai["toxicity_score"],
        ),
        reply={"empathy": ai["empathy"], "resources": ai["resources"]},
    )

# ---- Heatmap ----
@app.get("/api/heatmap", response_model=list[HeatOut])
def heatmap(hours: int = 2, precision: int = 6):
    since = datetime.utcnow() - timedelta(hours=hours)
    db = SessionLocal()
    try:
        rows = db.query(Report).filter(Report.created_at >= since).all()
        buckets: dict[str, dict] = {}
        for r in rows:
            if not r.geohash:
                continue
            gh = r.geohash[:max(1, min(precision, len(r.geohash)))]
            b = buckets.setdefault(gh, {"n": 0, "sum": 0.0, "neg": 0, "risk": 0})
            b["n"] += 1
            b["sum"] += float(r.sentiment_score or 0.0)
            if r.emotion == "negative": b["neg"] += 1
            if (r.risk_level or 0) >= 2: b["risk"] += 1

        out: list[HeatOut] = []
        for gh, v in buckets.items():
            n = max(v["n"], 1)
            out.append(HeatOut(
                geohash=gh,
                n=v["n"],
                avg_sentiment=v["sum"]/n,
                neg_ratio=v["neg"]/n,
                high_risk=v["risk"],
            ))
        return out
    finally:
        db.close()

# ---- Alerts ----
@app.get("/api/alerts", response_model=list[AlertOut])
def list_alerts(hours: int = 24):
    since = datetime.utcnow() - timedelta(hours=hours)
    db = SessionLocal()
    try:
        rows = db.query(Alert).filter(Alert.created_at >= since).all()
        return [AlertOut(
            id=a.id, geohash=a.geohash, level=a.level, rule_id=a.rule_id,
            created_at=a.created_at, payload=a.payload or {}
        ) for a in rows]
    finally:
        db.close()

# ---- Background alerts (simple demo) ----
stop_event = Event()

def _create_alert(db, geohash, level, rule, payload):
    db.add(Alert(id=str(uuid4()), geohash=geohash, level=level, rule_id=rule, payload=payload))

def run_aggregation_and_alerts():
    window = timedelta(hours=2)
    since = datetime.utcnow() - window
    db = SessionLocal()
    try:
        rows = db.query(Report).filter(Report.created_at >= since).all()
        by_gh: dict[str, dict] = {}
        for r in rows:
            gh = (r.geohash or "")[:6]
            if not gh: continue
            b = by_gh.setdefault(gh, {"n":0,"sum":0.0,"neg":0,"risk":0})
            b["n"] += 1
            b["sum"] += float(r.sentiment_score or 0.0)
            if r.emotion == "negative": b["neg"] += 1
            if (r.risk_level or 0) >= 2: b["risk"] += 1

        for gh,b in by_gh.items():
            if b["n"] < 15:  # k-anonymity
                continue
            avg = b["sum"]/b["n"]
            neg_ratio = b["neg"]/b["n"]
            if neg_ratio >= 0.6: _create_alert(db, gh, 1, "A", {"n":b["n"],"neg_ratio":neg_ratio})
            if b["risk"] >= 5:  _create_alert(db, gh, 2, "B", {"n":b["n"],"high_risk":b["risk"]})
            if avg <= -0.35 and b["n"]>=30: _create_alert(db, gh, 1, "C", {"n":b["n"],"avg":avg})
        db.commit()
    finally:
        db.close()

def scheduler():
    while not stop_event.is_set():
        try:
            run_aggregation_and_alerts()
        except Exception as e:
            print("cron error:", e)
        stop_event.wait(120)

Thread(target=scheduler, daemon=True).start()

# ---- DEV seed so heatmap shows color quickly (optional) ----
@app.post("/api/seed")
def seed(count: int = 60):
    texts_pos = ["I feel great", "Happy and calm", "Grateful day", "Wonderful"]
    texts_neg = ["I feel sad", "Very stressed", "Worried and tired", "Anxious"]
    areas = ["NW", "NE", "SW", "SE", "T2N", "T2E", "T3A"]

    db = SessionLocal()
    try:
        for _ in range(count):
            text = random.choice(texts_pos if random.random() > 0.45 else texts_neg)
            ai = analyze(text)
            gh = area_to_geohash(random.choice(areas))
            db.add(Report(
                id=str(uuid4()),
                geohash=gh,
                raw_text=ai["clean_text"],
                emotion=ai["emotion"],
                risk_level=ai["risk_level"],
                topics=ai["topics"],
                toxicity_score=ai["toxicity_score"],
                sentiment_score=ai["sentiment_score"],
            ))
        db.commit()
        return {"ok": True, "added": count}
    finally:
        db.close()
