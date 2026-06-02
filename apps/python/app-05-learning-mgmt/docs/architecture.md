# Architecture Document — App 05: Online Learning Management System

> Refer to [README.md](../README.md) for API endpoints, running instructions, and security benchmarking details.

## System Overview

A university-grade Learning Management System (LMS) providing course catalog browsing, student enrollment, quiz submission, auto-grading, instructor grading dashboards, and grade override. Built as a multi-service Flask monolith with PostgreSQL, MongoDB, and Redpanda (Kafka API) infrastructure.

## Architecture Diagram

```
Browser / HTTP Client
        │
        ▼
┌───────────────┐
│  Flask App    │  (port 8085)
│  (Monolith)   │
└───┬───┬───┬───┘
    │   │   │
    ▼   ▼   ▼
┌────┐ ┌──┐ ┌──────┐
│ PG │ │MQ│ │Mongo │
│15  │ │  │ │DB 6  │
└────┘ └──┘ └──────┘
```

**Services**: PostgreSQL 15 (courses, enrollments, users, submissions, grades), MongoDB 6 (quiz content, free-text answers), Redpanda (Kafka API — grading events, course import)

## Directory Structure

```
src/
├── config/          — DB connections (PostgreSQL, MongoDB), Kafka client, settings
├── routes/          — Flask Blueprint route definitions (10 route files)
├── controllers/     — Request handling and session validation (8 controllers)
├── services/        — Business logic (11 services: auth, course, debug, enrollment, grade, grading, import, prereq, rate-limiter, submission)
├── repositories/    — Data access layer (6 repositories)
├── workers/         — Background Kafka consumers (grading listener, import listener)
└── main.py          — Flask app factory
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.x, Flask |
| Database | PostgreSQL 15 (primary), MongoDB 6 (documents) |
| Message Queue | Redpanda (Kafka API) |
| Containerization | Docker, Docker Compose |

## Layer Architecture

- **Routes**: Flask Blueprints mapping HTTP paths to controller methods
- **Controllers**: Validate sessions, extract parameters, delegate to services
- **Services**: Business logic, orchestration across repositories
- **Repositories**: Raw SQL queries (parameterized and concatenated — intentional A03)
- **Workers**: Kafka consumers processing async events (grading, course import)

## Data Layer

| Entity | Store | Key Fields |
|---|---|---|
| Users | PostgreSQL | id, username, password_hash, role |
| Courses | PostgreSQL | id, name, instructor_id, prerequisites |
| Enrollments | PostgreSQL | id, user_id, course_id, role |
| Submissions | PostgreSQL+MQ | id, user_id, quiz_id, answers, grade |
| Quiz Content | MongoDB | questions, options, correct_answers |
| Audit Events | MQ Only | user, action, timestamp |

## Message Flow

```
POST /api/submissions → Controller → Service → PostgreSQL (submission)
                                               → Kafka (grading event)
                                                         → Worker (auto-grade)
                                                         → PostgreSQL (grade update)
```

## Deployment

4 Docker services (Docker Compose): web (Flask :8085), db (PostgreSQL :5432), mongodb (:27017), kafka (Redpanda :9092)

## Security Architecture

- 7 standalone vulnerabilities (A01 IDOR, A04 client-side role trust, A05 debug leak, A07 weak cookies, A08 pickle deserialization, A09 missing audit, A10 SSRF)
- 3 chained attacks: chain-01 (db_exfiltration), chain-02 (data_modification), chain-03 (lateral_movement)
- 7 decoys (parameterized SQL queries, scoped enrollment listing, hostname-validated fetch, httpOnly cookies)
- See `.vulns` for the complete manifest.
