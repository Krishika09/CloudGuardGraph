from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse

from ..service import WORKSPACE, service


router = APIRouter(prefix="/api")


@router.get("/workspaces")
def list_workspaces() -> list[dict]:
    return [WORKSPACE]


@router.get("/workspaces/{workspace_id}/scans")
def list_scans(workspace_id: str) -> list[dict]:
    return service.list_scans()


@router.post("/workspaces/{workspace_id}/scans")
def trigger_scan(workspace_id: str) -> dict:
    return service.trigger_scan()


@router.get("/workspaces/{workspace_id}/risk-trend")
def risk_trend(workspace_id: str) -> list[dict]:
    return service.risk_trend()


@router.get("/workspaces/{workspace_id}/users")
def users(workspace_id: str) -> list[dict]:
    return service.users


@router.post("/workspaces/{workspace_id}/users")
async def invite_user(workspace_id: str, request: Request) -> dict:
    body = await request.json()
    user = {"id": service._next_id("usr"), "name": body["name"], "email": body["email"], "role": body["role"], "status": "invited"}
    service.users.append(user)
    return user


@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request) -> dict:
    body = await request.json()
    for user in service.users:
        if user["id"] == user_id:
            user["role"] = body["role"]
            return user
    raise HTTPException(404, "User not found")


@router.delete("/users/{user_id}")
def remove_user(user_id: str) -> dict:
    for user in list(service.users):
        if user["id"] == user_id:
            service.users.remove(user)
            return {"ok": True}
    raise HTTPException(404, "User not found")


@router.get("/workspaces/{workspace_id}/audit-logs")
def audit_logs(workspace_id: str) -> list[dict]:
    return service.audit_logs


@router.get("/workspaces/{workspace_id}/settings")
def settings(workspace_id: str) -> dict:
    return service.settings


@router.patch("/workspaces/{workspace_id}/settings")
async def update_settings(workspace_id: str, request: Request) -> dict:
    service.settings.update(await request.json())
    return service.settings


@router.get("/workspaces/{workspace_id}/reports")
def reports(workspace_id: str) -> list[dict]:
    return service.reports


@router.post("/scans/{scan_id}/reports")
async def generate_report(scan_id: str, request: Request) -> dict:
    body = await request.json()
    try:
        return service.create_report(scan_id, body.get("template", "executive_summary"))
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.get("/reports/{report_id}")
def report_status(report_id: str) -> dict:
    report = next((item for item in service.reports if item["id"] == report_id), None)
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@router.get("/reports/{report_id}/download")
def download_report(report_id: str) -> HTMLResponse:
    body = service.report_body(report_id)
    if body is None:
        raise HTTPException(404, "Report not found")
    return HTMLResponse(
        body,
        headers={"Content-Disposition": f'attachment; filename="cloudguardgraph-{report_id}.html"'},
    )


@router.get("/notifications")
def notifications() -> list[dict]:
    return service.activity


@router.post("/notifications/read-all")
def mark_all_read() -> dict:
    for event in service.activity:
        event["read"] = True
    return {"ok": True}


@router.get("/scans/{scan_id}/summary")
def scan_summary(scan_id: str) -> dict:
    scan = service.get_scan(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan


@router.get("/scans/{scan_id}/inventory")
def inventory(scan_id: str) -> list[dict]:
    try:
        return service.resources(scan_id)
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.get("/scans/{scan_id}/findings")
def findings(scan_id: str) -> list[dict]:
    try:
        return service.findings(scan_id)
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.post("/findings/{finding_id}/suppress")
async def suppress_finding(finding_id: str, request: Request) -> dict:
    body = await request.json()
    finding = service.suppress_finding(finding_id, body.get("reason", ""), body.get("expiry"))
    if not finding:
        raise HTTPException(404, "Finding not found")
    return finding


@router.get("/scans/{scan_id}/graph")
def graph(scan_id: str) -> dict:
    try:
        return service.graph(scan_id)
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.get("/scans/{scan_id}/attack-paths")
def attack_paths(scan_id: str, status: str | None = None, target: str | None = None) -> list[dict]:
    try:
        paths = service.attack_paths(scan_id)
    except KeyError:
        raise HTTPException(404, "Scan not found") from None
    if status:
        paths = [path for path in paths if path["status"] == status]
    if target:
        paths = [path for path in paths if path["targetAssetId"] == target]
    return paths


@router.get("/attack-paths/{path_id}")
def attack_path_detail(path_id: str) -> dict:
    for path in service.attack_paths(service.latest_scan()["id"]):
        if path["id"] == path_id:
            return path
    raise HTTPException(404, "Attack path not found")


@router.get("/scans/{scan_id}/risk")
def risk(scan_id: str) -> dict:
    try:
        return service.risk(scan_id)
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.get("/scans/{scan_id}/recommendations")
def recommendations(scan_id: str) -> list[dict]:
    try:
        return service.recommendations(scan_id)
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.patch("/recommendations/{rec_id}")
async def update_recommendation(rec_id: str, request: Request) -> dict:
    body = await request.json()
    for rec in service.recommendations(service.latest_scan()["id"]):
        if rec["id"] == rec_id:
            rec["status"] = body["status"]
            return rec
    raise HTTPException(404, "Recommendation not found")


@router.post("/scans/{scan_id}/simulate")
async def simulate(scan_id: str, request: Request) -> dict:
    body = await request.json()
    try:
        return service.simulate(scan_id, body.get("recommendationIds", []))
    except KeyError:
        raise HTTPException(404, "Scan not found") from None


@router.get("/scans/{scan_id}/events")
async def scan_events(scan_id: str) -> StreamingResponse:
    async def stream():
        scan = service.get_scan(scan_id)
        if not scan:
            yield f"event: error\ndata: {json.dumps({'message': 'not found'})}\n\n"
            return
        if scan["status"] != "running":
            yield f"event: stage\ndata: {json.dumps(scan)}\n\n"
            yield "event: done\ndata: {}\n\n"
            return
        while True:
            await asyncio.sleep(0.4)
            updated = service.advance_scan(scan_id)
            yield f"event: stage\ndata: {json.dumps(updated)}\n\n"
            if updated and updated["status"] != "running":
                yield "event: done\ndata: {}\n\n"
                break

    return StreamingResponse(stream(), media_type="text/event-stream")

