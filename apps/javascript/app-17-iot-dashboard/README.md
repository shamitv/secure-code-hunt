# IoT Device Dashboard

## Overview
A JavaScript Express IoT dashboard for user login, device command execution, device status refresh, and internal telemetry diagnostics.

## Business Domain
Smart home and IoT device fleet management.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, JavaScript |
| Database | PostgreSQL 16 (pg), InMemoryStore fallback |
| Cache | Redis 7 (ioredis) |
| HTTP Client | Axios |
| WebSocket | ws |
| Containerisation | Docker, Docker Compose |

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features
- User registration and login
- Execute commands against IoT devices
- View public device profiles by ID
- Refresh device status from custom URLs
- Internal telemetry endpoint for device diagnostics
- Device telemetry history with filter query support
- Live WebSocket telemetry dashboard with real-time charts
- Diagnostics search via Elasticsearch query_string

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to `.vulns` for the complete machine-readable vulnerability manifest.

---

## Chained Vulnerability Scenarios

### Chain: "Debug Config Leak → HTTP SSRF → Plaintext Device Token Exposure → Lateral Movement"

An authenticated user triggers a command error that leaks an internal telemetry URL and token, then uses the device refresh SSRF to reach that internal telemetry endpoint and retrieve plaintext device tokens.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Verbose command errors return internal telemetry URL and access token | Medium | A05 | `src/services/DeviceService.js` → `commandError()` |
| 2 | Device refresh fetches caller-controlled URLs server-side | Medium | A10 | `src/services/RefreshService.js` → `refreshStatus()` |
| 3 | Internal telemetry returns plaintext device tokens | Medium | A02 | `src/services/TelemetryService.js` → `internalTelemetry()` |

**Attack narrative**: The attacker submits a command containing `TRIGGER-ERROR`, extracts `telemetry_server_url` and `telemetry_access_key` from the verbose response, then submits that internal telemetry URL to `/api/devices/refresh`. The server performs the internal HTTP request and returns device secrets from telemetry.

**Combined Impact**: The attacker pivots from the public dashboard into internal telemetry and obtains device tokens, enabling lateral movement.

### Chain: "IDOR Telemetry Access → SQL Injection → Database Exfiltration"

An authenticated user exploits missing device ownership checks to read any device's telemetry, then uses SQL injection in the telemetry filter parameter to dump database tables.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Device telemetry endpoint returns telemetry without verifying device ownership | Medium | A01 | `src/controllers/DeviceController.js` → `getDeviceTelemetry()` |
| 2 | Telemetry query filter concatenates raw SQL allowing injection | Medium | A03 | `src/repositories/TelemetryRepository.js` → `queryWithFilter()` |

**Attack narrative**: The attacker sends `GET /api/devices/2/telemetry` to read telemetry for a device they don't own (IDOR). Then sends `POST /api/devices/1/telemetry/query` with `{"filter": "1; UNION SELECT id,username,password_hash FROM users--"}` to inject SQL and extract user credentials from the database.

**Combined Impact**: The attacker exfiltrates user password hashes and device secrets from the PostgreSQL database.

---

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register new account |
| POST | `/api/auth/login` | None | Authenticate session |
| POST | `/api/auth/logout` | Session | Clear session |
| GET | `/api/health` | None | Container health check |
| POST | `/api/devices/command` | Session | Run commands |
| POST | `/api/devices/refresh` | Session | Query custom status URLs |
| GET | `/api/devices/:id` | Session | View public device profile |
| GET | `/api/devices/:id/telemetry` | Session | View device telemetry history |
| POST | `/api/devices/:id/telemetry/query` | Session | Query telemetry with filter |
| GET | `/api/devices/:id/telemetry/range` | Session | Query telemetry by time range |
| GET | `/api/internal/telemetry` | Token | Internal telemetry endpoint |
| GET | `/api/diagnostics/search` | Session | Elasticsearch device log search (vulnerable to DSL injection) |
| GET | `/api/diagnostics/search/safe` | Session | Elasticsearch device log search (safe — parameterized match) |
| WS | `/ws/telemetry` | None | Live device telemetry stream (unauthenticated) |
| GET | `/dashboard` | None | HTML telemetry dashboard |

## Running Locally
```bash
cd apps/javascript/app-17-iot-dashboard
npm install
npm start
# API served at http://localhost:8017
```

## Running via Docker
```bash
docker compose up --build
# API served at http://localhost:8017
```
