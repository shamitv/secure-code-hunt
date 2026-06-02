# Food Delivery Order System

## Overview
A FastAPI application representing a food delivery portal where users can browse menu items, place orders, and check status, while payment confirmation is handled via an external webhook.

## Business Domain
E-commerce & Food Delivery

## Tech Stack
- Python 3.10
- FastAPI
- SQLite (in-memory)

## Features

For chained vulnerability scenarios, see [scenarios.md](scenarios.md).
- User registration and login
- Browse menu items by category (e.g., Burgers, Pizza, Salads, Sides)
- Place food orders
- Retrieve details of specific orders
- Receive payment confirmation webhook from payment gateway

## Security Benchmarking
The vulnerabilities in this application are intentional. Refer to [.vulns](file:///d:/work/secure-code-hunt/apps/python/app-22-food-delivery/.vulns) for the complete list of vulnerability targets.

---

> For system architecture details, see [docs/architecture.md](docs/architecture.md).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/register` | None | Register new customer |
| POST   | `/api/auth/login` | None | Authenticate user and receive session cookie (vulnerable session cookie) |
| POST   | `/api/auth/logout` | Session | Terminate session |
| GET    | `/api/auth/me` | Session | Get current user status |
| GET    | `/api/menu` | None | List menu items (Decoy) |
| POST   | `/api/orders` | Session | Place a food order (vulnerable to missing rate limits) |
| GET    | `/api/orders/{order_id}` | Session | View details of an order |
| POST   | `/api/payment/webhook` | Token | Payment gateway webhook (vulnerable to forged requests) |

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. The application runs on port `8092`.

## Running via Docker

1. Build the image:
   ```bash
   docker build -t app-22-food-delivery .
   ```
2. Run the container:
   ```bash
   docker run -p 8092:8092 app-22-food-delivery
   ```