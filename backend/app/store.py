"""In-memory mutable store, seeded from app.seed. Resets on process restart."""
import asyncio
import copy
import itertools
import time
import uuid

from . import seed

_id_counter = itertools.count(1000)


def _next_id(prefix: str) -> str:
    return f"{prefix}-{next(_id_counter)}"


class Store:
    def __init__(self) -> None:
        self.workspace = copy.deepcopy(seed.WORKSPACE)
        self.resources = copy.deepcopy(seed.RESOURCES)
        self.findings = copy.deepcopy(seed.FINDINGS)
        self.attack_paths = copy.deepcopy(seed.ATTACK_PATHS)
        self.recommendations = copy.deepcopy(seed.RECOMMENDATIONS)
        self.risk_analysis = copy.deepcopy(seed.RISK_ANALYSIS)
        self.risk_trend = copy.deepcopy(seed.RISK_TREND)
        self.scans = copy.deepcopy(seed.SCANS)
        self.activity = copy.deepcopy(seed.ACTIVITY_EVENTS)
        self.users = copy.deepcopy(seed.USERS)
        self.audit_logs = copy.deepcopy(seed.AUDIT_LOGS)
        self.reports = copy.deepcopy(seed.REPORTS)
        self.settings = {
            "generalName": "Prod AWS",
            "timezone": "UTC",
            "ruleCategories": {
                "exposure": True,
                "over_permission": True,
                "data_exposure": True,
                "privilege_escalation": True,
                "secrets": True,
            },
            "failScanOnCritical": False,
            "aiModel": "llama3",
        }
        # scanId -> {"stageIndex": int, "status": str, "startedAt": float}
        self.running_scans: dict[str, dict] = {}

    # ---- scans -------------------------------------------------------
    def latest_scan(self):
        return max(self.scans, key=lambda s: s["number"])

    def get_scan(self, scan_id: str):
        return next((s for s in self.scans if s["id"] == scan_id), None)

    def audit(self, actor: str, action: str, target: str, detail: str | None = None):
        self.audit_logs.insert(0, {
            "id": _next_id("log"),
            "timestamp": _now_iso(),
            "actor": actor,
            "action": action,
            "target": target,
            "detail": detail,
        })

    def notify(self, type_: str, message: str, href: str):
        self.activity.insert(0, {
            "id": _next_id("evt"),
            "type": type_,
            "message": message,
            "timestamp": _now_iso(),
            "read": False,
            "href": href,
        })

    def trigger_scan(self, triggered_by: str) -> dict:
        latest = self.latest_scan()
        new_number = latest["number"] + 1
        scan = {
            "id": _next_id("scan"),
            "number": new_number,
            "workspaceId": self.workspace["id"],
            "status": "running",
            "triggeredBy": triggered_by,
            "triggeredAt": _now_iso(),
            "finishedAt": None,
            "riskScore": latest["riskScore"],
            "riskDelta": 0,
            "criticalPathCount": latest["criticalPathCount"],
            "criticalPathDelta": 0,
            "findingsCount": latest["findingsCount"],
            "assetsCount": latest["assetsCount"],
            "currentStage": seed.PIPELINE_STAGES[0],
            "currentStageIndex": 0,
        }
        self.scans.append(scan)
        self.running_scans[scan["id"]] = {"stageIndex": 0, "status": "running"}
        self.audit(triggered_by, "scan.triggered", f"Scan #{new_number}", "Uploaded terraform bundle")
        return scan

    def advance_scan(self, scan_id: str) -> dict | None:
        """Advance one pipeline stage. Returns the updated scan record."""
        scan = self.get_scan(scan_id)
        running = self.running_scans.get(scan_id)
        if not scan or not running or running["status"] != "running":
            return scan
        idx = running["stageIndex"] + 1
        if idx >= len(seed.PIPELINE_STAGES):
            running["status"] = "success"
            scan["status"] = "success"
            scan["finishedAt"] = _now_iso()
            scan["currentStage"] = None
            scan["currentStageIndex"] = None
            import random
            drift = random.choice([-6, -3, 2, 4, 6])
            prev = self.scans[-2] if len(self.scans) > 1 else scan
            scan["riskScore"] = max(5, min(99, prev["riskScore"] + drift))
            scan["riskDelta"] = scan["riskScore"] - prev["riskScore"]
            scan["criticalPathCount"] = prev["criticalPathCount"]
            scan["criticalPathDelta"] = 0
            self.risk_trend.append({
                "scanNumber": scan["number"], "date": scan["finishedAt"][:10],
                "riskScore": scan["riskScore"], "criticalPaths": scan["criticalPathCount"],
            })
            self.notify("scan_completed", f"Scan #{scan['number']} completed — risk score {scan['riskScore']} ({'+' if scan['riskDelta']>=0 else ''}{scan['riskDelta']})", "/scans")
        else:
            running["stageIndex"] = idx
            scan["currentStage"] = seed.PIPELINE_STAGES[idx]
            scan["currentStageIndex"] = idx
        return scan

    # ---- findings ------------------------------------------------------
    def suppress_finding(self, finding_id: str, reason: str, expiry: str | None, actor: str):
        finding = next((f for f in self.findings if f["id"] == finding_id), None)
        if not finding:
            return None
        finding["status"] = "suppressed"
        finding["suppressReason"] = reason
        finding["suppressExpiry"] = expiry
        self.audit(actor, "finding.suppressed", finding_id, f"Justification: {reason}")
        return finding

    # ---- recommendations -------------------------------------------------
    def update_recommendation_status(self, rec_id: str, status: str, actor: str):
        rec = next((r for r in self.recommendations if r["id"] == rec_id), None)
        if not rec:
            return None
        rec["status"] = status
        self.audit(actor, f"recommendation.{status}", rec_id)
        return rec

    # ---- simulation -------------------------------------------------
    def simulate(self, recommendation_ids: list[str]) -> dict:
        recs = [r for r in self.recommendations if r["id"] in recommendation_ids]
        before = self.risk_analysis["compositeScore"]
        total_reduction = sum(r["estRiskReduction"] for r in recs)
        after = max(5, before - total_reduction)

        covered_finding_ids = {r["findingId"] for r in recs}
        # A path is eliminated once the recommendation directly tied to it
        # is included in the scenario -- a simple, predictable rule that's
        # easy to explain in the UI ("this path's fix is in your selection").
        eliminated = [
            path for path in self.attack_paths
            if path.get("recommendationId") in recommendation_ids
        ]

        return {
            "before": before,
            "after": after,
            "pathsEliminated": eliminated,
            "findingsResolved": len(covered_finding_ids),
        }

    # ---- reports -------------------------------------------------
    def create_report(self, template: str, scan_number: int, actor: str) -> dict:
        report = {
            "id": _next_id("rpt"),
            "name": f"{template.replace('_', ' ').title()} — Scan #{scan_number}",
            "template": template,
            "scanNumber": scan_number,
            "generatedAt": _now_iso(),
            "status": "generating",
        }
        self.reports.insert(0, report)
        self.audit(actor, "report.generated", report["name"])
        self.notify("report_generated", f"{report['name']} is generating", "/reports")
        return report

    def finalize_report(self, report_id: str):
        report = next((r for r in self.reports if r["id"] == report_id), None)
        if report and report["status"] == "generating":
            report["status"] = "ready"
        return report

    # ---- users -------------------------------------------------
    def invite_user(self, name: str, email: str, role: str, actor: str) -> dict:
        user = {"id": _next_id("usr"), "name": name, "email": email, "role": role, "status": "invited"}
        self.users.append(user)
        self.audit(actor, "user.invited", email, f"Role: {role}")
        self.notify("user_role_changed", f"{name} invited as {role.title()}", "/users")
        return user

    def update_user_role(self, user_id: str, role: str, actor: str):
        user = next((u for u in self.users if u["id"] == user_id), None)
        if not user:
            return None
        old_role = user["role"]
        user["role"] = role
        self.audit(actor, "user.role_changed", user["email"], f"{old_role} -> {role}")
        return user

    def remove_user(self, user_id: str, actor: str):
        user = next((u for u in self.users if u["id"] == user_id), None)
        if user:
            self.users.remove(user)
            self.audit(actor, "user.removed", user["email"])
        return user


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


store = Store()
