# Smart Home Device Manager

## Overview
A FastAPI web application representing an IoT Smart Home Hub, allowing residents to register smart home devices, execute commands, view sensor telemetry, and trigger remote firmware updates.

## Business Domain
IoT & Smart Home Automation

## Tech Stack
- Python 3.10
- FastAPI
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User login & session management
- Register and view smart home devices (Thermostat, Lock, Garage)
- Send commands to specific devices (with token verification decoy)
- Proxy request telemetry from sensor data endpoints
- Apply device firmware updates from remote download URLs
- Rate-limited status checking

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-47-smart-home/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and receive session cookie |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/debug/devices` | None | Leak registered devices and access tokens (vulnerable debug endpoint) |
| GET    | `/api/devices/sensor-data` | Session | Proxy request telemetry data (vulnerable to SSRF) |
| POST   | `/api/devices/{device_id}/firmware/update` | Session | Trigger device firmware update (vulnerable to unsigned binaries) |
| POST   | `/api/devices/{device_id}/command` | Session + Token | Send command to device (Decoy: validates device token) |
| GET    | `/api/devices/{device_id}/status` | Session | Poll device current status (Decoy: rate-limited) |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8097`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-47-smart-home .
   ```
2. Run the container:
   ```bash
   docker run -p 8097:8097 app-47-smart-home
   ```