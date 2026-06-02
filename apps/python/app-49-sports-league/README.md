# Sports League Management

## Overview
A Flask web application representing a sports league administration system, where fans can view team standings, players can view profiles, and league commissioners can manage teams and games.

## Business Domain
Entertainment & Sports Administration

## Tech Stack
- Python 3.10
- Flask
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User authentication and session management (roles: FAN, PLAYER, COMMISSIONER)
- View team standings (with parameterized search decoy)
- Search league players
- View player profiles
- Update game scores
- Export standings table to CSV
- Register new teams (with role verification decoy)

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-49-sports-league/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login` | None | Authenticate user and initialize session |
| POST   | `/api/auth/logout` | Session | Clear session |
| GET    | `/api/auth/me` | Session | Get active user profile info |
| GET    | `/api/standings/export` | None | Export standings to CSV (vulnerable to schema leak in headers) |
| GET    | `/api/standings` | None | List team standings (Decoy: parameterized SQL) |
| GET    | `/api/players/search` | Session | Search players in league (vulnerable to SQLi) |
| GET    | `/api/players/<player_id>` | Session | Retrieve detailed player profile (vulnerable to IDOR) |
| POST   | `/api/games/<game_id>/score` | Session | Update game scores (vulnerable to missing authorization checks) |
| POST   | `/api/teams` | Session (Commissioner) | Add a new team (Decoy: checks role is COMMISSIONER) |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8099`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-49-sports-league .
   ```
2. Run the container:
   ```bash
   docker run -p 8099:8099 app-49-sports-league
   ```