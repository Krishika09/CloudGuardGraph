import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..store import store

router = APIRouter(prefix="/api")

CURRENT_USER = "Alex Romero"  # v1 has a single implicit session; see Settings/Users for RBAC modeling


# ---------------------------------------------------------------- workspace
@router.get("/workspaces")
def list_workspaces():
    return [store.workspace]


@router.get("/workspaces/{workspace_id}/scans")
def list_scans(workspace_id: str):
    return sorted(store.scans, key=lambda s: s["number"], reverse=True)


@router.post("/workspaces/{workspace_id}/scans")
def trigger_scan(workspace_id: str):
    scan = store.trigger_scan(CURRENT_USER)
    return scan


@router.get("/workspaces/{workspace_id}/risk-trend")
def risk_trend(workspace_id: str):
    return store.risk_trend


@router.get("/workspaces/{workspace_id}/users")
def list_users(workspace_id: str):
    return store.users


@router.post("/workspaces/{workspace_id}/users")
async def invite_user(workspace_id: str, request: Request):
    body = await request.json()
    return store.invite_user(body["name"], body["email"], body["role"], CURRENT_USER)


@router.patch("/users/{user_id}/role")
async def change_user_role(user_id: str, request: Request):
    body = await request.json()
    user = store.update_user_role(user_id, body["role"], CURRENT_USER)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    user = store.remove_user(user_id, CURRENT_USER)
    if not user:
        raise HTTPException(404, "User not found")
    return {"ok": True}


@router.get("/workspaces/{workspace_id}/audit-logs")
def audit_logs(workspace_id: str):
    return store.audit_logs


@router.get("/workspaces/{workspace_id}/settings")
def get_settings(workspace_id: str):
    return store.settings


@router.patch("/workspaces/{workspace_id}/settings")
async def update_settings(workspace_id: str, request: Request):
    body = await request.json()
    store.settings.update(body)
    store.audit(CURRENT_USER, "settings.updated", "Workspace Settings")
    return store.settings


@router.get("/workspaces/{workspace_id}/reports")
def list_reports(workspace_id: str):
    return store.reports


@router.post("/scans/{scan_id}/reports")
async def generate_report(scan_id: str, request: Request):
    body = await request.json()
    scan = store.get_scan(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    report = store.create_report(body.get("template", "executive_summary"), scan["number"], CURRENT_USER)
    return report


@router.get("/reports/{report_id}")
def get_report(report_id: str):
    report = next((r for r in store.reports if r["id"] == report_id), None)
    if not report:
        raise HTTPException(404, "Report not found")
    if report["status"] == "generating":
        store.finalize_report(report_id)
        report = next((r for r in store.reports if r["id"] == report_id), None)
    return report


@router.get("/reports/{report_id}/download")
def download_report(report_id: str):
    report = next((r for r in store.reports if r["id"] == report_id), None)
    if not report:
        raise HTTPException(404, "Report not found")
    body = (
        f"CloudGuardGraph — {report['name']}\n"
        f"Template: {report['template']}\n"
        f"Generated: {report['generatedAt']}\n\n"
        f"Overall risk score: {store.risk_analysis['compositeScore']}\n"
        f"Critical attack paths: {sum(1 for p in store.attack_paths if p['severity'] == 'critical')}\n\n"
        "This is a v1 placeholder export. Real PDF assembly (ReportLab, per the "
        "architecture doc's Module 11) replaces this endpoint's body once wired to the "
        "real pipeline.\n"
    )
    return StreamingResponse(
        iter([body.encode()]),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{report["name"]}.txt"'},
    )


# ---------------------------------------------------------------- notifications
@router.get("/notifications")
def list_notifications():
    return store.activity


@router.post("/notifications/read-all")
def mark_all_read():
    for evt in store.activity:
        evt["read"] = True
    return {"ok": True}


# ---------------------------------------------------------------- scan-scoped data
@router.get("/scans/{scan_id}/summary")
def scan_summary(scan_id: str):
    scan = store.get_scan(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan


@router.get("/scans/{scan_id}/inventory")
def scan_inventory(scan_id: str):
    return store.resources


@router.get("/scans/{scan_id}/findings")
def scan_findings(scan_id: str):
    return store.findings


@router.post("/findings/{finding_id}/suppress")
async def suppress_finding(finding_id: str, request: Request):
    body = await request.json()
    finding = store.suppress_finding(finding_id, body.get("reason", ""), body.get("expiry"), CURRENT_USER)
    if not finding:
        raise HTTPException(404, "Finding not found")
    return finding


@router.get("/scans/{scan_id}/graph")
def scan_graph(scan_id: str):
    nodes = [
        {"id": r["id"], "label": r["name"], "type": r["type"], "worstSeverity": r.get("worstSeverity")}
        for r in store.resources
    ]
    edges = []
    edge_specs = [
        ("res-internet", "res-lb-public", "routes to"),
        ("res-internet", "res-ec2-web-01", "network-reachable"),
        ("res-internet", "res-ec2-worker-02", "network-reachable"),
        ("res-lb-public", "res-ec2-web-01", "forwards to"),
        ("res-ec2-web-01", "res-iam-role-ec2-admin", "assumes role"),
        ("res-ec2-web-01", "res-s3-public-assets", "can read"),
        ("res-ec2-worker-02", "res-iam-role-app", "assumes role"),
        ("res-iam-role-ec2-admin", "res-secret-db-credential", "can read"),
        ("res-iam-role-ec2-admin", "res-s3-private-backups", "can read"),
        ("res-iam-role-app", "res-secret-api-key", "can read"),
        ("res-secret-db-credential", "res-db-production", "unlocks"),
    ]
    critical_edges = {
        ("res-internet", "res-ec2-web-01"),
        ("res-ec2-web-01", "res-iam-role-ec2-admin"),
        ("res-iam-role-ec2-admin", "res-secret-db-credential"),
        ("res-secret-db-credential", "res-db-production"),
    }
    for i, (src, tgt, rel) in enumerate(edge_specs):
        edges.append({
            "id": f"edge-{i}",
            "source": src,
            "target": tgt,
            "relationship": rel,
            "onCriticalPath": (src, tgt) in critical_edges,
        })
    return {"nodes": nodes, "edges": edges}


@router.get("/scans/{scan_id}/attack-paths")
def scan_attack_paths(scan_id: str, status: str | None = None, target: str | None = None):
    paths = store.attack_paths
    if status:
        paths = [p for p in paths if p["status"] == status]
    if target:
        paths = [p for p in paths if p["targetAssetId"] == target]
    return sorted(paths, key=lambda p: p["riskScore"], reverse=True)


@router.get("/attack-paths/{path_id}")
def attack_path_detail(path_id: str):
    path = next((p for p in store.attack_paths if p["id"] == path_id), None)
    if not path:
        raise HTTPException(404, "Attack path not found")
    return path


@router.get("/scans/{scan_id}/risk")
def scan_risk(scan_id: str):
    return store.risk_analysis


@router.get("/scans/{scan_id}/recommendations")
def scan_recommendations(scan_id: str):
    return sorted(store.recommendations, key=lambda r: r["estRiskReduction"], reverse=True)


@router.patch("/recommendations/{rec_id}")
async def update_recommendation(rec_id: str, request: Request):
    body = await request.json()
    rec = store.update_recommendation_status(rec_id, body["status"], CURRENT_USER)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    return rec


@router.post("/scans/{scan_id}/simulate")
async def simulate(scan_id: str, request: Request):
    body = await request.json()
    rec_ids = body.get("recommendationIds", [])
    return store.simulate(rec_ids)


# ---------------------------------------------------------------- live scan progress (SSE)
@router.get("/scans/{scan_id}/events")
async def scan_events(scan_id: str):
    async def stream():
        scan = store.get_scan(scan_id)
        if not scan:
            yield f"event: error\ndata: {json.dumps({'message': 'not found'})}\n\n"
            return
        if scan["status"] != "running":
            yield f"event: stage\ndata: {json.dumps(scan)}\n\n"
            yield "event: done\ndata: {}\n\n"
            return
        while True:
            await asyncio.sleep(1.1)
            updated = store.advance_scan(scan_id)
            yield f"event: stage\ndata: {json.dumps(updated)}\n\n"
            if updated["status"] != "running":
                yield "event: done\ndata: {}\n\n"
                break

    return StreamingResponse(stream(), media_type="text/event-stream")
