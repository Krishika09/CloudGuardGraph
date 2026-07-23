"""HTML report generation for CloudGuardGraph."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from jinja2 import Template


REPORT_TEMPLATE = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CloudGuardGraph Security Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #172033; background: #f7f8fb; }
    h1, h2 { color: #111827; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 24px 0; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .metric { font-size: 28px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; }
    th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    th { background: #eef2f7; }
    .Critical { color: #b91c1c; font-weight: 700; }
    .High { color: #c2410c; font-weight: 700; }
    .Medium { color: #a16207; font-weight: 700; }
    .Low { color: #2563eb; font-weight: 700; }
  </style>
</head>
<body>
  <h1>CloudGuardGraph Security Report</h1>
  <p>Generated {{ generated_at }}</p>
  <p>
    CloudGuardGraph correlates isolated misconfiguration findings into attack
    paths from public entry points to sensitive assets, then explains risk and
    estimates remediation impact.
  </p>

  <section class="summary">
    <div class="card"><div>Total Assets</div><div class="metric">{{ summary.total_assets }}</div></div>
    <div class="card"><div>Total Findings</div><div class="metric">{{ summary.total_findings }}</div></div>
    <div class="card"><div>Critical Findings</div><div class="metric">{{ summary.critical_findings }}</div></div>
    <div class="card"><div>Attack Paths</div><div class="metric">{{ summary.attack_paths }}</div></div>
  </section>

  <h2>Findings By Severity</h2>
  <table>
    <tr><th>Severity</th><th>Count</th></tr>
    {% for severity, count in severity_counts.items() %}
    <tr><td class="{{ severity }}">{{ severity }}</td><td>{{ count }}</td></tr>
    {% endfor %}
  </table>

  <h2>Top Attack Paths</h2>
  <table>
    <tr><th>ID</th><th>Path</th><th>Target</th><th>Risk</th><th>Explanation</th><th>Recommended Fixes</th></tr>
    {% for path in paths %}
    <tr>
      <td>{{ path.id }}</td>
      <td>{{ path.nodes | join(" -> ") }}</td>
      <td>{{ path.target }}</td>
      <td class="{{ path.severity }}">{{ path.risk }} {{ path.severity }}</td>
      <td>{{ path.why }}</td>
      <td>{{ ", ".join(path.fixes) }}</td>
    </tr>
    {% endfor %}
  </table>

  <h2>Top Risky Resources</h2>
  <table>
    <tr><th>Resource</th><th>Type</th><th>Finding Count</th><th>Risk Weight</th></tr>
    {% for resource in risky_resources %}
    <tr>
      <td>{{ resource.resource_id }}</td>
      <td>{{ resource.resource_type }}</td>
      <td>{{ resource.finding_count }}</td>
      <td>{{ resource.risk_weight }}</td>
    </tr>
    {% endfor %}
  </table>

  <h2>Limitations</h2>
  <p>
    This report is generated from the local CloudGuardGraph pipeline: Checkov
    findings, IAM rules, synthetic inventory, NetworkX paths, and risk scoring.
  </p>

  <h2>Future Work</h2>
  <p>
    Add CloudSplaining/PMapper-style IAM analysis, richer AWS inventory import,
    more cloud services, and evaluation against realistic IaC repositories.
  </p>
</body>
</html>
"""


def build_report(summary: dict, severity_counts: dict, paths: list[dict], risky_resources: list[dict]) -> str:
    template = Template(REPORT_TEMPLATE)
    return template.render(
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        summary=summary,
        severity_counts=severity_counts,
        paths=paths,
        risky_resources=risky_resources,
    )


def save_report(html: str, output_path: Path | str = "reports/report.html") -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    return path
