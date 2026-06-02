# Online Learning Management System

## Overview
A university-grade Learning Management System (LMS) providing course catalog browsing, student enrollment, quiz submission, auto-grading, instructor grading dashboards, and grade override.

## Business Domain
Education Technology (EdTech)

## Tech Stack
Python, Flask, PostgreSQL, MongoDB, Apache Kafka (Redpanda), Pickle (for course import), psycopg2, pymongo, kafka-python

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## Features

- User authentication with role-based access (Student, Instructor, Admin)
- Course catalog with browsing and creation
- Student enrollment management (vulnerable: trusts client-supplied role)
- Quiz submission with auto-grading (multiple-choice, free-text, code snippet)
- Rate-limited submission retry
- Prerequisite course validation helper
- Student dashboard with gradebook and active courses
- Instructor dashboard with grading queue and grade override
- Course import via serialized pickle data (RCE vector)
- URL-based course content import (SSRF vector)
- Operational metrics endpoint (internal only)

## Security Benchmarking
This application contains intentionally planted vulnerabilities for security agent benchmarking. See [.vulns](.vulns) for the ground-truth manifest.

---

## Chained Vulnerability Scenarios

### Chain 1: "Config Leak -> Session Forgery -> Quiz Submission Exfiltration"

An attacker recovers the Flask signing secret, forges a privileged session, and reads another student's submission.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Debug endpoint exposes secrets without authentication | Low | A05 | `src/services/debug_service.py` -> `collect()` |
| 2 | Session role values are trusted after cookie verification | Medium | A02 | `src/services/auth_service.py` -> `current_user()` |
| 3 | Submission lookup omits student ownership checks | Medium | A01 | `src/services/submission_service.py` -> `get_submission()` |

**Attack narrative**: The attacker calls `/api/debug/config`, uses the leaked secret to forge a signed session cookie with elevated role claims, and requests `/api/submissions/{id}` for submissions owned by other students.

**Combined Impact**: Unauthorized exfiltration of quiz answers and grades.

### Chain 2: "Enrollment Role Escalation -> Missing Audit -> Undetected Grade Tampering"

An attacker uses the weak enrollment validation to escalate privileges to INSTRUCTOR, then overrides student grades without leaving an audit trail.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Enrollment trusts client-supplied role, enabling privilege escalation | Low | A04 | `src/controllers/enrollment_controller.py` -> `enroll()` |
| 2 | Grade override writes scores without course-ownership check and without audit log | Low | A09 | `src/workers/grading_listener.py` -> `process_submission()` |

**Attack narrative**: The attacker sends an enrollment request with `{"course_id": 99, "role": "INSTRUCTOR"}`. The A04 vulnerability accepts the elevated role. Now authenticated as an instructor, the attacker calls `POST /api/instructor/grades/override` to modify any student's grade. The grade override writes to the `grades` table without creating an `audit_log` entry (A09), leaving no trace of the tampering.

**Combined Impact**: Undetected modification of student grades.

### Chain 3: "Debug Config Leak -> SSRF Internal Pivot"

An attacker leaks internal Docker service hostnames from the debug endpoint, then uses the SSRF in course import to pivot to an internal-only metrics endpoint.

| Step | Issue | Severity (standalone) | OWASP | Location |
|------|-------|-----------------------|-------|----------|
| 1 | Debug endpoint leaks internal service hostnames and endpoint paths | Low | A05 | `src/services/debug_service.py` -> `collect()` |
| 2 | SSRF fetches user-supplied URL without hostname validation | Medium | A10 | `src/services/import_service.py` -> `fetch_content()` |

**Attack narrative**: The attacker sends `GET /api/debug/config`, obtaining internal Docker service hostnames and the `/admin/internal/metrics` path. Then the attacker calls `POST /api/courses/import` with `{"url": "http://localhost:8085/admin/internal/metrics"}`. The SSRF in `fetch_content()` fetches the URL without hostname validation. The `/admin/internal/metrics` endpoint has no Docker port mapping and is unreachable externally, but the SSRF originates from within the container, bypassing the network boundary.

**Combined Impact**: Lateral movement — attacker exfiltrates internal-only operational data.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | No | User login |
| POST | /api/auth/dashboard-login | No | Dashboard login (A07: weak cookies) |
| POST | /api/auth/logout | Yes | User logout |
| GET | /api/auth/me | Yes | Current user info |
| GET | /api/health | No | Health check (PG, Mongo, Kafka status) |
| GET | /api/courses | No | List all courses |
| POST | /api/courses | Yes (Instructor/Admin) | Create a course |
| POST | /api/courses/import | Yes (Instructor/Admin) | Import course from pickle data or URL |
| GET | /api/enrollments | Yes | List current user's enrollments |
| POST | /api/enrollments | Yes | Enroll in a course (A04: trusts client role) |
| GET | /api/submissions/{id} | Yes | View a quiz submission (A01: IDOR) |
| POST | /api/submissions | Yes | Submit quiz answers (auto-graded, rate-limited) |
| GET | /api/debug/config | No | Debug configuration (A05: leaks secrets) |
| GET | /api/instructor/courses | Yes (Instructor) | Instructor course dashboard |
| GET | /api/instructor/submissions/{quiz_id} | Yes (Instructor) | View quiz submissions |
| POST | /api/instructor/grades/override | Yes (Instructor) | Override grade (A09: no audit) |
| GET | /dashboard/student | Student | Student portal UI |
| GET | /dashboard/instructor | Instructor+ | Instructor portal UI |
| GET | /admin/internal/metrics | Internal | Internal operational metrics (SSRF target for chain-03) |

## Running Locally

```sh
pip install -r requirements.txt
python app.py
# Server starts on http://localhost:8085
# Requires PostgreSQL, MongoDB, and Kafka to be running.
# Use Docker Compose for all dependencies.
```

## Running via Docker

```sh
docker compose up --build
```
