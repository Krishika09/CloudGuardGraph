# CloudGuardGraph

CloudGuardGraph is a cloud security correlation tool that converts isolated IaC and IAM findings into realistic attack paths, explains why those paths matter, and simulates how remediation reduces graph-based risk.

CloudGuardGraph differs from traditional misconfiguration scanners by correlating isolated findings into realistic attack paths and simulating how remediations reduce graph-based risk.

## Current Status

This repository is the merged course-project version:

- The original Streamlit dashboard has been removed.
- The active dashboard is a React/Vite frontend in `frontend/`.
- A FastAPI backend in `backend/` serves the API needed by the dashboard.
- The attack graph, risk scoring, explanation, simulation, and report layers are custom-built in `src/`.
- Sample Terraform, synthetic inventory, and Checkov JSON data feed the Phase 1 analysis pipeline.
- `python -m src.pipeline` generates `outputs/analysis.json`, which is the dashboard's source of truth.
- Terraform has been expanded into a realistic multi-file vulnerable AWS lab under `data/terraform/`.
- Checkov has been run against the Terraform lab and currently produces real failed checks in `outputs/checkov_results.json`.
- Backend and frontend validation currently pass.

Validated commands:

```bash
python -m src.pipeline
python -m pytest -q
npm run build
```

Current known non-blocking issue:

- The frontend build reports large bundle chunks. This does not stop the demo.

## Project Scope

This project uses existing tools for:

- Checkov for Terraform/IaC misconfiguration scanning
- NetworkX for graph and path analysis
- Jinja2 for HTML report generation
- React/Vite for the presentation dashboard
- FastAPI for connecting the dashboard to the backend logic

Custom-built project layers:

- Synthetic cloud inventory
- Checkov result adapter
- Simple IAM detector
- Cloud asset graph
- Attack path engine
- Risk scoring
- Explainability
- Fix simulator
- Dashboard API integration
- HTML report

## Architecture

```text
Terraform IaC
    |
    v
Checkov JSON Output
    |
    v
Checkov Adapter ---- Synthetic Inventory ---- IAM Detector
        |                    |                     |
        +--------------------+---------------------+
                             |
                             v
                     Normalized Findings
                             |
                             v
                    NetworkX Asset Graph
                             |
                             v
                    Attack Path Engine
                             |
                             v
              Risk Engine + Explainability
                             |
              +--------------+--------------+
              |                             |
              v                             v
       Remediation Simulator          HTML Report
              |
              v
       React/Vite Dashboard
```

## Project Structure

```text
backend/       FastAPI API used by the React dashboard
frontend/      React/Vite dashboard
data/          Terraform vulnerable AWS lab and synthetic cloud inventory
outputs/       Checkov JSON sample/output files
src/           CloudGuardGraph backend intelligence modules
reports/       Generated HTML report output
tests/         Core and backend contract tests
```

Current Terraform lab files:

```text
data/terraform/
  main.tf
  variables.tf
  network.tf
  security_groups.tf
  iam.tf
  ec2.tf
  s3.tf
  rds.tf
  secrets.tf
  load_balancer.tf
  outputs.tf
```

## How To Run

Generate or refresh the analysis first:

```bash
cd CloudGuardGraph
source .venv/bin/activate
python -m src.pipeline
```

To regenerate Checkov results and then run the pipeline in one safe flow:

```bash
python -m src.pipeline --run-checkov
```

Run the backend in the first terminal:

```bash
cd CloudGuardGraph
source .venv/bin/activate
python -m uvicorn backend.main:app --reload --port 8010
```

Run the frontend in a second terminal:

```bash
cd CloudGuardGraph/frontend
npm run dev
```

Open the dashboard:

```text
http://localhost:5173
```

The frontend proxies `/api/*` requests to the backend at:

```text
http://localhost:8010
```

To stop the app, press `Ctrl + C` in both terminals.

## Pipeline Output

The main Phase 1 deliverable is:

```text
outputs/analysis.json
```

It contains:

- Metadata
- Summary metrics
- Assets
- Normalized findings
- Serialized graph nodes and edges
- Scored attack paths
- Explanations
- Recommendations
- Risky resource summary

The FastAPI backend reads this file and adapts it to the React dashboard contract.

## Fresh Setup

If dependencies are missing, install them once.

Python backend:

```bash
cd CloudGuardGraph
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Frontend:

```bash
cd CloudGuardGraph/frontend
npm install
```

## Testing

Backend/core tests:

```bash
cd CloudGuardGraph
source .venv/bin/activate
python -m pytest -q
```

Frontend build:

```bash
cd CloudGuardGraph/frontend
npm run build
```

Frontend lint:

```bash
cd CloudGuardGraph/frontend
npm run lint
```

## Checkov Data

The current demo uses:

```text
outputs/checkov_results.json
```

A backup sample is also included:

```text
outputs/checkov_results_sample.json
```

To regenerate Checkov output when Checkov is available:

```bash
python -m src.checkov_runner
```

The runner writes Checkov output to a temporary file first, validates that it is real JSON with failed checks, and then atomically replaces `outputs/checkov_results.json`.

Manual Checkov command, if needed:

```bash
python -m checkov.main -d data/terraform --framework terraform --output json --quiet > outputs/checkov_results.json
```

Checkov returns a non-zero process status when failed checks are found. That is expected for this intentionally vulnerable lab.

## Core Modules

- `src/loader.py` loads inventory and scanner output.
- `src/checkov_adapter.py` normalizes failed Checkov checks.
- `src/iam_detector.py` detects dangerous IAM permissions.
- `src/detectors.py` merges and deduplicates findings.
- `src/graph_builder.py` builds the cloud asset graph.
- `src/attack_paths.py` finds paths from Internet to sensitive assets.
- `src/risk_engine.py` scores attack paths.
- `src/explainability.py` creates plain-English explanations.
- `src/simulator.py` simulates remediation impact.
- `src/report.py` generates the HTML report.

## Example Attack Path

```text
Internet -> ec2-public-app -> role-app-admin -> secret-prod-db -> db-prod
```

Example interpretation:

```text
Internet can reach a public EC2 instance. That instance assumes an over-permissive IAM role. The role can read a production database secret, and that secret unlocks a critical database.
```

## Risk Scoring

Attack path score is calculated using simple explainable rules:

- `+30` path starts from Internet
- `+25` path contains wildcard/admin IAM
- `+20` target is critical
- `+15` path contains a secret
- `+10` open security group finding exists
- `+10` public S3 without encryption

Scores are clamped to `100`.

Severity mapping:

- `0-39`: Low
- `40-59`: Medium
- `60-79`: High
- `80-100`: Critical

## Remediation Simulator

The simulator currently supports four remediation types:

- `make_s3_private`
- `enable_s3_encryption`
- `restrict_security_group`
- `remove_secret_read_permission`

It rebuilds the graph after the selected fix and compares:

- Before risk
- After risk
- Risk reduction percentage
- Removed attack paths
- Remaining attack paths

## Report

The HTML report is generated through `src/report.py` and can be served through the backend report endpoint used by the dashboard.

Report output location:

```text
reports/report.html
```

## What Is Complete

- React frontend merged into the course project
- Streamlit dashboard removed
- FastAPI API adapter added
- Phase 1 real pipeline added
- `outputs/analysis.json` generated from inventory, Checkov output, detectors, graph analysis, risk scoring, and recommendations
- Phase 2 realistic vulnerable Terraform lab added
- Real Checkov failed checks generated from `data/terraform/`
- Atomic Checkov runner added to prevent empty or half-written scan output
- Checkov adapter implemented
- IAM detector implemented
- NetworkX graph builder implemented
- Attack path engine implemented
- Risk scoring implemented
- Explainability implemented
- Simulator implemented
- HTML report generator implemented
- Core/backend tests added

## What To Do Next

- Expand inventory relationships so the graph represents more realistic AWS attack scenarios.
- Remove or hide any remaining frontend screens that distract from the final-year scope.
- Add dashboard screenshots for README and presentation.
- Polish the generated HTML report visually.
- Run fresh Checkov output before final submission if required.
- Prepare the final project write-up around graph-based attack-path correlation and remediation simulation.

## Project Note

This project uses Checkov as an external IaC scanner. The attack graph, risk scoring, explanation, simulation, API adapter, and dashboard integration layers are custom-built.
