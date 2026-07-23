# CloudGuardGraph

CloudGuardGraph is a cloud security posture management (CSPM) dashboard that models a cloud
environment as a graph of resources, surfaces misconfigurations, and traces them into concrete
**attack paths** — e.g. `Internet → EC2 → IAM Role → Secret → Production DB` — so teams can see
not just *what* is misconfigured but *how* it can be chained into a breach, and what to fix first.

This repo currently ships a **v1 mock backend**: a FastAPI service that serves the full API
contract (workspaces, scans, findings, attack graph, risk scoring, recommendations, simulation,
reports, users, audit logs) from static in-memory fixture data. It stands in for the real
`Parser → Detector → Graph Builder → Attack Path Engine → Risk Engine → Explainability → AI
Remediation → Simulation` pipeline, using the same request/response contract, so the frontend
won't need to change when the real pipeline is wired in.

## Features

- **Overview** — workspace risk summary and risk trend over time.
- **Cloud Inventory** — discovered cloud resources and their worst severity.
- **Findings** — misconfigurations/vulnerabilities, with suppression support.
- **Attack Graph** — interactive graph view of resources and relationships (built on
  [`@xyflow/react`](https://reactflow.dev/)), highlighting edges on critical attack paths.
- **Attack Paths** — ranked exploitation chains from an entry point to a target asset, filterable
  by status/target.
- **Risk Analysis** — composite risk scoring for a scan.
- **Recommendations** — prioritized remediations ranked by estimated risk reduction, with status
  tracking.
- **Simulator** — "what-if" simulation of applying a set of recommendations.
- **Reports** — generate and download report exports (executive summary, etc.).
- **Scan History** — past scans and triggering new scans, with live progress via Server-Sent
  Events.
- **User Management / Audit Logs / Settings** — workspace user roles, an audit trail of actions,
  and workspace settings.

## Tech stack

- **Backend:** Python, FastAPI, Uvicorn — in-memory fixture data (`backend/app/seed.py`,
  `backend/app/store.py`), REST + SSE API (`backend/app/routers/api.py`).
- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router,
  `@xyflow/react` (graph view), ECharts (charts), AG Grid (tables), shadcn/ui components.

## Prerequisites

- Python 3.11+ (a `.venv` is already set up under `backend/.venv`)
- Node.js 18+ and npm

## Running the backend

```bash
cd backend
# create/activate a virtual environment if you don't already have one
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate    # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8010
```

The API is now available at `http://localhost:8010/api`, with a health check at
`http://localhost:8010/api/health`.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. In development, Vite proxies all `/api/*` requests to
the backend at `http://localhost:8010` (see `frontend/vite.config.ts`), so start the backend
first.

### Other frontend scripts

```bash
npm run build     # type-check (tsc -b) and production build
npm run preview   # preview the production build
npm run lint       # lint with oxlint
```

## Project structure

```
backend/
  main.py                 # FastAPI app entrypoint
  app/
    routers/api.py         # all REST + SSE endpoints
    store.py                # in-memory data store / mutation logic
    seed.py                 # fixture/seed data
frontend/
  src/
    pages/                 # one file per route (Overview, Findings, AttackGraph, ...)
    components/            # shared/layout/UI components
    lib/api.ts              # typed fetch client for the backend API
    store/                  # Zustand stores
    types/domain.ts          # shared domain types
```
