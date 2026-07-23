"""
CloudGuardGraph — v1 mock backend.

Serves the API map from the UX audit's Phase 10 against static, in-memory
fixture data (see app/seed.py) styled after the project doc's canonical
scenario. This stands in for the real Parser -> Detector -> Graph Builder ->
Attack Path Engine -> Risk Engine -> Explainability -> AI Remediation ->
Simulation pipeline: same request/response contract, so the frontend never
needs to change when the real pipeline is wired in later.

Run with:  uvicorn main:app --reload --port 8010
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.api import router

app = FastAPI(title="CloudGuardGraph API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
