import re
import geohash2
from typing import Dict
from transformers import pipeline

PII_PATTERNS = [
    (re.compile(r'\b[\w\.-]+@[\w\.-]+\.\w+\b'), '[EMAIL]'),
    (re.compile(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'), '[PHONE]'),
    (re.compile(r'\b\d{1,4}\s+[A-Za-z0-9.\-\s]{3,}\b'), '[ADDR]'),
]
def redact(t:str)->str:
    for pat,rep in PII_PATTERNS: t = pat.sub(rep, t)
    return t.strip()

_sentiment = _topics = _toxic = None
TOPIC_LABELS = [
    "housing","cost_of_living","mental_health","bullying","violence","harassment",
    "drug_use","homelessness","public_safety","discrimination","education","healthcare","transport"
]
def get_pipes():
    global _sentiment,_topics,_toxic
    if _sentiment is None:
        _sentiment = pipeline("sentiment-analysis","cardiffnlp/twitter-roberta-base-sentiment-latest")
    if _topics is None:
        _topics = pipeline("zero-shot-classification","facebook/bart-large-mnli",hypothesis_template="This text is about {}.")
    if _toxic is None:
        _toxic = pipeline("text-classification","unitary/toxic-bert",return_all_scores=True)
    return _sentiment,_topics,_toxic

def area_to_geohash(area:str|None)->str:
    lat,lng=51.0447,-114.0719  # Calgary center
    if not area: return geohash2.encode(lat,lng,precision=6)
    a=area.upper().replace(" ","")
    dx=dy=0.0
    if a in ("NW","NE","SW","SE"):
        dy=0.06 if a[0]=="N" else -0.06
        dx=0.06 if a[1]=="E" else -0.06
    elif re.match(r"^[A-Z]\d[A-Z]",a):
        dx=(hash(a)&255)/255*0.04-0.02; dy=(hash(a)>>8&255)/255*0.04-0.02
    return geohash2.encode(lat+dy,lng+dx,precision=6)

def analyze(text:str)->Dict:
    s_pipe,t_pipe,tox_pipe = get_pipes()
    clean = redact(text)

    s = s_pipe(clean)[0]
    label = s["label"].lower()
    score = s["score"]
    sentiment_score = {'positive': score, 'neutral': 0.0, 'negative': -score}.get(label,0.0)

    t = t_pipe(clean, TOPIC_LABELS, multi_label=True)
    labels_scores = list(zip(t["labels"], t["scores"]))
    labels_scores.sort(key=lambda x: x[1], reverse=True)
    topics = [l for l,_ in labels_scores[:3]]

    tox = 0.0
    for item in tox_pipe(clean)[0]:
        if item["label"].lower() in ("toxic","toxicity"):
            tox=float(item["score"]); break

    risk=0
    low=clean.lower()
    if any(k in low for k in ["suicide","kill myself","kill him","self-harm","violence","attack"]):
        risk=3
    elif tox>0.6 or (label=="negative" and abs(sentiment_score)>0.7):
        risk=2
    elif label=="negative":
        risk=1

    empathy="Thanks for sharing. Your feelings are valid. You are not alone."
    resources=[]
    if "cost_of_living" in topics or "housing" in topics:
        resources += [
            {"title":"Calgary 211 Community Resources","url":"https://ab.211.ca/"},
            {"title":"Calgary Food Bank","url":"https://www.calgaryfoodbank.com/"}
        ]
    if "mental_health" in topics or risk>=2:
        resources += [{"title":"AHS Mental Health Help Line (24/7)","url":"https://www.albertahealthservices.ca/amh/Page16759.aspx"}]
    if "homelessness" in topics:
        resources += [{"title":"The Mustard Seed Calgary","url":"https://theseed.ca/"}]

    return {
        "clean_text": clean,
        "emotion": label,
        "sentiment_score": float(sentiment_score),
        "topics": topics,
        "toxicity_score": float(tox),
        "risk_level": int(risk),
        "empathy": empathy,
        "resources": resources
    }
