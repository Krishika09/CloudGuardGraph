"""Frontend contract adapter backed by the course project engine."""

from __future__ import annotations

import itertools
import json
import time
from copy import deepcopy
from pathlib import Path
from typing import Any

from src.attack_paths import find_attack_paths
from src.detectors import collect_findings, severity_summary
from src.explainability import explain_paths
from src.graph_builder import build_graph
from src.loader import PROJECT_ROOT, load_inventory
from src.pipeline import DEFAULT_ANALYSIS_PATH, build_analysis, run_pipeline
from src.report import build_report, save_report
from src.risk_engine import score_paths
from src.simulator import apply_fix


WORKSPACE = {"id": "ws-course-aws", "name": "Course Project AWS", "environmentLabel": "Production", "provider": "aws"}
PIPELINE_STAGES = [
    "parser",
    "detector",
    "graph_builder",
    "attack_path_engine",
    "risk_engine",
    "explainability",
    "ai_remediation",
    "simulation_preview",
]
SEVERITY_ORDER = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
TYPE_MAP = {"external": "internet", "s3_bucket": "s3"}
FINDING_CATEGORY = {
    "Open ingress": "exposure",
    "Public bucket": "data_exposure",
    "Missing encryption": "data_exposure",
    "Admin/Wildcard Access": "over_permission",
    "Broad S3 Access": "over_permission",
    "Privilege Escalation": "privilege_escalation",
    "Secret Access": "secrets",
}
FIX_TYPES = {
    "Open ingress": "restrict_security_group",
    "Public bucket": "make_s3_private",
    "Missing encryption": "enable_s3_encryption",
    "Secret Access": "remove_secret_read_permission",
    "Admin/Wildcard Access": "remove_secret_read_permission",
    "Privilege Escalation": "remove_secret_read_permission",
    "Broad S3 Access": "make_s3_private",
}


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _severity(value: str | None) -> str | None:
    return value.lower() if value else None


def _resource_type(value: str | None) -> str:
    return TYPE_MAP.get(value or "", value or "ec2")


def _asset_name(asset: dict) -> str:
    return asset.get("name") or asset["id"]


class DashboardService:
    def __init__(self) -> None:
        self._id_counter = itertools.count(1000)
        self._analysis_cache: dict[str, Any] | None = None
        self._analysis_mtime: float | None = None
        self.scan_number = 12
        self.reports = [
            {
                "id": "rpt-001",
                "name": "Executive Summary - Scan #12",
                "template": "executive_summary",
                "scanNumber": 12,
                "generatedAt": _now_iso(),
                "status": "ready",
            }
        ]
        self.users = [
            {"id": "usr-1", "name": "Manan", "email": "manan@example.com", "role": "admin", "status": "active", "lastActive": _now_iso()},
            {"id": "usr-2", "name": "Project Reviewer", "email": "reviewer@example.com", "role": "viewer", "status": "active", "lastActive": _now_iso()},
        ]
        self.audit_logs = [
            {"id": "log-001", "timestamp": _now_iso(), "actor": "CloudGuardGraph", "action": "dashboard.loaded", "target": "Scan #12", "detail": "Course project backend contract initialized"}
        ]
        self.activity = [
            {"id": "evt-001", "type": "scan_completed", "message": "Sample scan completed - attack paths calculated", "timestamp": _now_iso(), "read": False, "href": "/attack-paths"}
        ]
        self.running_scans: dict[str, dict[str, Any]] = {}
        self.settings = {
            "generalName": WORKSPACE["name"],
            "timezone": "Asia/Kolkata",
            "ruleCategories": {
                "exposure": True,
                "over_permission": True,
                "data_exposure": True,
                "privilege_escalation": True,
                "secrets": True,
            },
            "failScanOnCritical": False,
            "aiModel": "rules+jinja2",
        }
        self.scans = [self._scan_summary("scan-12", 12, "success", risk_delta=0, critical_delta=0)]

    def _next_id(self, prefix: str) -> str:
        return f"{prefix}-{next(self._id_counter)}"

    def _inventory(self) -> dict:
        return load_inventory()

    def _analysis(self) -> dict[str, Any]:
        analysis_path = PROJECT_ROOT / DEFAULT_ANALYSIS_PATH
        if not analysis_path.exists():
            run_pipeline()
        mtime = analysis_path.stat().st_mtime
        if self._analysis_cache is None or self._analysis_mtime != mtime:
            self._analysis_cache = json.loads(analysis_path.read_text(encoding="utf-8"))
            self._analysis_mtime = mtime
        return self._analysis_cache

    def _calculate(self, inventory: dict | None = None) -> dict[str, Any]:
        if inventory is None:
            analysis = self._analysis()
            return {
                "inventory": {"assets": analysis["assets"]},
                "findings": analysis["findings"],
                "graph_data": analysis["graph"],
                "paths": analysis["attack_paths"],
            }
        findings = collect_findings(inventory)
        graph = build_graph(inventory)
        paths = explain_paths(score_paths(find_attack_paths(graph, inventory), inventory, findings), inventory, findings)
        return {"inventory": inventory, "findings": findings, "graph": graph, "paths": paths}

    def _scan_summary(self, scan_id: str, number: int, status: str, risk_delta: int = 0, critical_delta: int = 0) -> dict:
        analysis = self._analysis()
        findings = analysis["findings"]
        paths = analysis["attack_paths"]
        risk = analysis["summary"]["max_risk"]
        return {
            "id": scan_id,
            "number": number,
            "workspaceId": WORKSPACE["id"],
            "status": status,
            "triggeredBy": "CloudGuardGraph",
            "triggeredAt": _now_iso(),
            "finishedAt": _now_iso() if status == "success" else None,
            "riskScore": risk,
            "riskDelta": risk_delta,
            "criticalPathCount": sum(1 for path in paths if path["severity"] == "Critical"),
            "criticalPathDelta": critical_delta,
            "findingsCount": len(findings),
            "assetsCount": analysis["summary"]["total_assets"],
            "currentStage": PIPELINE_STAGES[0] if status == "running" else None,
            "currentStageIndex": 0 if status == "running" else None,
        }

    def latest_scan(self) -> dict:
        return max(self.scans, key=lambda item: item["number"])

    def get_scan(self, scan_id: str) -> dict | None:
        return next((scan for scan in self.scans if scan["id"] == scan_id), None)

    def list_scans(self) -> list[dict]:
        return sorted(self.scans, key=lambda item: item["number"], reverse=True)

    def trigger_scan(self) -> dict:
        latest = self.latest_scan()
        run_pipeline()
        self._analysis_cache = None
        self._analysis_mtime = None
        scan = self._scan_summary(self._next_id("scan"), latest["number"] + 1, "running")
        self.scans.append(scan)
        self.running_scans[scan["id"]] = {"stageIndex": 0}
        self.audit_logs.insert(0, {"id": self._next_id("log"), "timestamp": _now_iso(), "actor": "CloudGuardGraph", "action": "scan.triggered", "target": f"Scan #{scan['number']}", "detail": "Sample Terraform/IaC analysis run"})
        return scan

    def advance_scan(self, scan_id: str) -> dict | None:
        scan = self.get_scan(scan_id)
        running = self.running_scans.get(scan_id)
        if not scan or not running:
            return scan
        idx = running["stageIndex"] + 1
        if idx >= len(PIPELINE_STAGES):
            previous = self.scans[-2] if len(self.scans) > 1 else scan
            complete = self._scan_summary(scan["id"], scan["number"], "success")
            complete["riskDelta"] = complete["riskScore"] - previous["riskScore"]
            complete["criticalPathDelta"] = complete["criticalPathCount"] - previous["criticalPathCount"]
            scan.update(complete)
            self.running_scans.pop(scan_id, None)
            self.activity.insert(0, {"id": self._next_id("evt"), "type": "scan_completed", "message": f"Scan #{scan['number']} completed - risk score {scan['riskScore']}", "timestamp": _now_iso(), "read": False, "href": "/scans"})
        else:
            running["stageIndex"] = idx
            scan["currentStage"] = PIPELINE_STAGES[idx]
            scan["currentStageIndex"] = idx
        return scan

    def resources(self, scan_id: str) -> list[dict]:
        self._require_scan(scan_id)
        analysis = self._analysis()
        graph = analysis["graph"]
        findings = analysis["findings"]
        degree_counts: dict[str, int] = {}
        for edge in graph["edges"]:
            degree_counts[edge["source"]] = degree_counts.get(edge["source"], 0) + 1
            degree_counts[edge["target"]] = degree_counts.get(edge["target"], 0) + 1
        worst: dict[str, str] = {}
        counts: dict[str, int] = {}
        for finding in findings:
            resource_id = finding["resource_id"]
            counts[resource_id] = counts.get(resource_id, 0) + 1
            current = worst.get(resource_id)
            if current is None or SEVERITY_ORDER[finding["severity"]] > SEVERITY_ORDER[current]:
                worst[resource_id] = finding["severity"]

        resources = []
        for asset in analysis["assets"]:
            resource_id = asset["id"]
            resources.append(
                {
                    "id": resource_id,
                    "name": _asset_name(asset),
                    "type": _resource_type(asset.get("type")),
                    "isPublic": bool(asset.get("public", False)),
                    "tags": {"criticality": asset.get("criticality", "medium")},
                    "findingsCount": counts.get(resource_id, 0),
                    "worstSeverity": _severity(worst.get(resource_id)),
                    "connections": degree_counts.get(resource_id, 0),
                    "sourceSnippet": asset.get("sourceSnippet"),
                    "attributes": {k: v for k, v in asset.items() if k not in {"id", "name", "type", "sourceSnippet"}},
                }
            )
        return resources

    def findings(self, scan_id: str) -> list[dict]:
        self._require_scan(scan_id)
        resources = {resource["id"]: resource for resource in self.resources(scan_id)}
        attack_path_ids_by_finding = self._attack_path_ids_by_finding(scan_id)
        normalized = []
        for finding in self._analysis()["findings"]:
            resource = resources.get(finding["resource_id"], {})
            normalized.append(
                {
                    "id": finding["id"],
                    "title": finding["type"],
                    "severity": _severity(finding["severity"]),
                    "category": FINDING_CATEGORY.get(finding["type"], "exposure"),
                    "ruleId": finding.get("check_id") or finding["id"],
                    "resourceId": finding["resource_id"],
                    "resourceName": resource.get("name", finding["resource_id"]),
                    "resourceType": _resource_type(finding["resource_type"]),
                    "status": finding.get("status", "open"),
                    "partOfAttackPath": bool(attack_path_ids_by_finding.get(finding["id"])),
                    "attackPathIds": attack_path_ids_by_finding.get(finding["id"], []),
                    "detectedInScan": self.latest_scan()["number"],
                    "description": finding["reason"],
                    "configSnippet": finding.get("check_name") or finding.get("permission") or finding["reason"],
                }
            )
        return normalized

    def graph(self, scan_id: str) -> dict:
        self._require_scan(scan_id)
        analysis = self._analysis()
        resources = {resource["id"]: resource for resource in self.resources(scan_id)}
        critical_edges = {
            (source, target)
            for path in analysis["attack_paths"]
            if path["severity"] == "Critical"
            for source, target in zip(path["nodes"], path["nodes"][1:])
        }
        nodes = [
            *(
                {
                    "id": node["id"],
                    "label": node.get("label", node["id"]),
                    "type": _resource_type(node.get("type")),
                    "worstSeverity": _severity(resources.get(node["id"], {}).get("worstSeverity")),
                }
                for node in analysis["graph"]["nodes"]
            ),
        ]
        seen_nodes = set()
        deduped_nodes = []
        for node in nodes:
            if node["id"] in seen_nodes:
                continue
            seen_nodes.add(node["id"])
            deduped_nodes.append(node)
        edges = [
            {
                "id": edge.get("id", f"edge-{index}"),
                "source": edge["source"],
                "target": edge["target"],
                "relationship": edge.get("relation", "RELATED_TO"),
                "onCriticalPath": (edge["source"], edge["target"]) in critical_edges,
            }
            for index, edge in enumerate(analysis["graph"]["edges"])
        ]
        return {"nodes": deduped_nodes, "edges": edges}

    def attack_paths(self, scan_id: str) -> list[dict]:
        self._require_scan(scan_id)
        resources = {resource["id"]: resource for resource in self.resources(scan_id)}
        paths = []
        for index, path in enumerate(self._analysis()["attack_paths"], start=1):
            frontend_id = f"path-{index}"
            paths.append(
                {
                    "id": frontend_id,
                    "targetAssetId": path["target"],
                    "targetAssetName": resources.get(path["target"], {}).get("name", path["target"]),
                    "entryPoint": "internet" if path["nodes"][0] == "Internet" else "internal",
                    "riskScore": path.get("risk_score", path["risk"]),
                    "severity": _severity(path["severity"]),
                    "hops": max(len(path["nodes"]) - 1, 0),
                    "status": "new" if index == 1 else "existing",
                    "nodes": [
                        {
                            "resourceId": node,
                            "resourceName": "Internet" if node == "Internet" else resources.get(node, {}).get("name", node),
                            "resourceType": "internet" if node == "Internet" else resources.get(node, {}).get("type", "ec2"),
                        }
                        for node in path["nodes"]
                    ],
                    "contributingFindingIds": path.get("related_findings", path.get("findings", [])),
                    "explanation": path.get("explanation", [path.get("why", "Attack path reaches a sensitive asset.")]),
                    "recommendationId": self._recommendation_id_for_path(path),
                }
            )
        return paths

    def risk(self, scan_id: str) -> dict:
        self._require_scan(scan_id)
        paths = self.attack_paths(scan_id)
        findings = self.findings(scan_id)
        score = max((path["riskScore"] for path in paths), default=0)
        return {
            "compositeScore": score,
            "factors": {
                "exposure": min(100, 30 + sum(1 for finding in findings if finding["category"] == "exposure") * 12),
                "privilegeLevel": min(100, 30 + sum(1 for finding in findings if finding["category"] in {"over_permission", "privilege_escalation"}) * 18),
                "dataSensitivity": min(100, 40 + sum(1 for finding in findings if finding["category"] in {"data_exposure", "secrets"}) * 10),
                "exploitability": min(100, 35 + len(paths) * 14),
                "dangerousPermissions": min(100, 25 + sum(1 for finding in findings if finding["resourceType"] == "iam_role") * 15),
            },
            "distribution": [
                {"bucket": "0-20", "count": sum(1 for path in paths if path["riskScore"] <= 20)},
                {"bucket": "21-40", "count": sum(1 for path in paths if 21 <= path["riskScore"] <= 40)},
                {"bucket": "41-60", "count": sum(1 for path in paths if 41 <= path["riskScore"] <= 60)},
                {"bucket": "61-80", "count": sum(1 for path in paths if 61 <= path["riskScore"] <= 80)},
                {"bucket": "81-100", "count": sum(1 for path in paths if path["riskScore"] >= 81)},
            ],
            "byAsset": [
                {
                    "resourceId": path["targetAssetId"],
                    "resourceName": path["targetAssetName"],
                    "resourceType": path["nodes"][-1]["resourceType"],
                    "contribution": path["riskScore"],
                }
                for path in paths[:5]
            ],
        }

    def recommendations(self, scan_id: str) -> list[dict]:
        self._require_scan(scan_id)
        findings = {finding["id"]: finding for finding in self.findings(scan_id)}
        paths_by_finding: dict[str, str] = {}
        for path in self.attack_paths(scan_id):
            for finding_id in path["contributingFindingIds"]:
                paths_by_finding.setdefault(finding_id, path["id"])
        recommendations = []
        for index, recommendation in enumerate(self._analysis()["recommendations"], start=1):
            finding = findings.get(recommendation["finding_id"])
            if not finding:
                continue
            fix_type = recommendation["fix_type"]
            recommendations.append(
                {
                    "id": f"rec-{index:03d}",
                    "findingId": finding["id"],
                    "attackPathId": paths_by_finding.get(finding["id"]),
                    "title": recommendation["title"],
                    "summary": recommendation["reason"],
                    "resourceName": finding["resourceName"],
                    "estRiskReduction": recommendation["estimated_risk_reduction"],
                    "effort": recommendation["effort"],
                    "status": recommendation["status"],
                    "diffBefore": finding["configSnippet"],
                    "diffAfter": recommendation["fix"],
                    "modelAttribution": "Generated by CloudGuardGraph rule-based remediation engine",
                    "fixType": fix_type,
                }
            )
        return sorted(recommendations, key=lambda item: item["estRiskReduction"], reverse=True)

    def simulate(self, scan_id: str, recommendation_ids: list[str]) -> dict:
        self._require_scan(scan_id)
        before_paths = self.attack_paths(scan_id)
        recommendations = {rec["id"]: rec for rec in self.recommendations(scan_id)}
        inventory = deepcopy(self._inventory())
        estimated_reduction = 0
        for rec_id in recommendation_ids:
            rec = recommendations.get(rec_id)
            if rec:
                estimated_reduction += rec["estRiskReduction"]
                inventory = apply_fix(inventory, rec["fixType"])
        after_state = self._calculate(inventory)
        after_paths = self._frontend_paths_from_engine(after_state["paths"], inventory)
        before_score = max((path["riskScore"] for path in before_paths), default=0)
        graph_after_score = max((path["riskScore"] for path in after_paths), default=0)
        after_score = min(graph_after_score, max(5, before_score - estimated_reduction))
        after_node_paths = {tuple(node["resourceId"] for node in path["nodes"]) for path in after_paths}
        eliminated = [
            path for path in before_paths
            if tuple(node["resourceId"] for node in path["nodes"]) not in after_node_paths
        ]
        return {
            "before": before_score,
            "after": after_score,
            "pathsEliminated": eliminated,
            "findingsResolved": len(recommendation_ids),
        }

    def suppress_finding(self, finding_id: str, reason: str, expiry: str | None) -> dict | None:
        for finding in self.findings(self.latest_scan()["id"]):
            if finding["id"] == finding_id:
                finding["status"] = "suppressed"
                finding["suppressReason"] = reason
                finding["suppressExpiry"] = expiry
                return finding
        return None

    def create_report(self, scan_id: str, template: str) -> dict:
        self._require_scan(scan_id)
        report = {
            "id": self._next_id("rpt"),
            "name": f"{template.replace('_', ' ').title()} - Scan #{self.latest_scan()['number']}",
            "template": template,
            "scanNumber": self.latest_scan()["number"],
            "generatedAt": _now_iso(),
            "status": "ready",
        }
        self.reports.insert(0, report)
        return report

    def report_body(self, report_id: str) -> str | None:
        report = next((item for item in self.reports if item["id"] == report_id), None)
        if not report:
            return None
        analysis = self._analysis()
        html = build_report(
            analysis["summary"],
            analysis["severity_counts"],
            analysis["attack_paths"][:10],
            analysis["risky_resources"][:10],
        )
        save_report(html, PROJECT_ROOT / "reports" / "report.html")
        return html

    def risk_trend(self) -> list[dict]:
        latest = self.latest_scan()
        return [
            {"scanNumber": latest["number"] - 3, "date": "2026-07-02", "riskScore": max(latest["riskScore"] - 14, 0), "criticalPaths": max(latest["criticalPathCount"] - 1, 0)},
            {"scanNumber": latest["number"] - 2, "date": "2026-07-09", "riskScore": max(latest["riskScore"] - 8, 0), "criticalPaths": latest["criticalPathCount"]},
            {"scanNumber": latest["number"] - 1, "date": "2026-07-16", "riskScore": max(latest["riskScore"] - 4, 0), "criticalPaths": latest["criticalPathCount"]},
            {"scanNumber": latest["number"], "date": "2026-07-23", "riskScore": latest["riskScore"], "criticalPaths": latest["criticalPathCount"]},
        ]

    def _frontend_paths_from_engine(self, paths: list[dict], inventory: dict) -> list[dict]:
        resources = {
            asset["id"]: {"name": _asset_name(asset), "type": _resource_type(asset.get("type"))}
            for asset in inventory.get("assets", [])
        }
        frontend_paths = []
        for index, path in enumerate(paths, start=1):
            frontend_paths.append(
                {
                    "id": f"path-{index}",
                    "targetAssetId": path["target"],
                    "targetAssetName": resources.get(path["target"], {}).get("name", path["target"]),
                    "entryPoint": "internet" if path["nodes"][0] == "Internet" else "internal",
                    "riskScore": path["risk"],
                    "severity": _severity(path["severity"]),
                    "hops": len(path["nodes"]) - 1,
                    "status": "new" if index == 1 else "existing",
                    "nodes": [
                        {
                            "resourceId": node,
                            "resourceName": "Internet" if node == "Internet" else resources.get(node, {}).get("name", node),
                            "resourceType": "internet" if node == "Internet" else resources.get(node, {}).get("type", "ec2"),
                        }
                        for node in path["nodes"]
                    ],
                    "contributingFindingIds": path.get("findings", []),
                    "explanation": path.get("explanation", [path.get("why", "")]),
                    "recommendationId": self._recommendation_id_for_path(path),
                }
            )
        return frontend_paths

    def _attack_path_ids_by_finding(self, scan_id: str) -> dict[str, list[str]]:
        mapping: dict[str, list[str]] = {}
        for path in self.attack_paths(scan_id):
            for finding_id in path["contributingFindingIds"]:
                mapping.setdefault(finding_id, []).append(path["id"])
        return mapping

    def _recommendation_id_for_path(self, path: dict) -> str | None:
        finding_ids = path.get("findings", [])
        if not finding_ids:
            return None
        first = finding_ids[0]
        try:
            number = int(first.split("-")[1])
        except (IndexError, ValueError):
            return "rec-001"
        return f"rec-{number:03d}"

    def _fix_text(self, fix_type: str) -> str:
        return {
            "restrict_security_group": "Restrict public ingress to trusted CIDR ranges or private load balancer security groups.",
            "make_s3_private": "Enable Block Public Access and remove public bucket policy/ACL grants.",
            "enable_s3_encryption": "Enable default encryption with a KMS-managed key.",
            "remove_secret_read_permission": "Remove broad secret-read permissions and scope access to required secret ARNs.",
        }.get(fix_type, "Apply least-privilege remediation.")

    def _require_scan(self, scan_id: str) -> None:
        if not self.get_scan(scan_id):
            raise KeyError(scan_id)


service = DashboardService()
