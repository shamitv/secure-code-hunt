# Architecture Document — App 01: Supplier Portal Frontend

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## Overview

A TypeScript React 18 single-page application (SPA) for supplier users to manage reports, configure webhooks, and access admin console features. This frontend communicates with the Python Flask backend services (Catalog, Reporting, Supplier Portal API) described in the main [app-01 architecture](../README.md#architecture).

## Architecture Diagram

```
Browser → React SPA (Vite dev :3000)
            │
            ├── /portal/* → Supplier Portal API (:5003)
            ├── /api/admin/* → Reporting Service (:5002)
            └── /api/supplier/* → Supplier Portal API (:5003)
```

## Directory Structure

```
src/
├── context/          — AuthContext (login/logout, token management)
├── pages/            — Page-level components
│   ├── Login.tsx     — Supplier login
│   ├── DashboardPage.tsx — KPI cards, reports
│   ├── ReportsPage.tsx   — Report list + enqueue (XSS vuln)
│   ├── ReportDetail.tsx  — Job status, download
│   ├── Webhooks.tsx      — Webhook CRUD
│   └── admin/            — Admin console pages
├── hooks/            — Data fetching hooks (useDashboard, useReports, useWebhooks)
├── components/       — Shared UI components (Header, Layout, DashboardWidgets, etc.)
├── services/         — Axios API client
├── i18n/             — Locale dictionaries (en, es) and context
└── styles/           — CSS stylesheets
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18, TypeScript |
| Build | Vite |
| HTTP Client | Axios |
| Routing | React Router |
| i18n | Custom context-based locale switching |
| Containerization | Docker (production build via Vite) |

## Data Flow

1. User authenticates via LoginPage → POST /portal/auth/login → token stored in AuthContext
2. Pages use React hooks (useDashboard, useReports) → services/api.ts (Axios) → Flask backend
3. Token is included in request headers for authenticated calls

## Security Architecture

- 2 standalone XSS vulnerabilities in ReportsPage and AdminFlagDetailPage (`dangerouslySetInnerHTML`)
- 1 chain (chain-03): CustomWidgetRenderer (step 1) → AdminFlagDetail (step 2) → stored XSS → account_takeover
- 2 decoys: ReportNotes safe renderer (textContent), client-side webhook URL validation
- See `.vulns` for the complete manifest.
