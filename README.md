# Docker: Journey to Microservices

Build a 5-service microservices architecture from scratch using .NET 9, PostgreSQL, and React.

```
         You
          │
    ┌─────┴─────┐
    │  Frontend │ (:3000)
    └─────┬─────┘
          │
    API Gateway (:9000)
      /   │   \
  Users Orders Inventory
```

---

## Prerequisites

```bash
docker --version      # Docker 20.x or higher
docker compose version # Compose v2.x
```

---

## The Steps

| Step | What You'll Learn | Time |
|------|-------------------|------|
| [Step 1](./step-1-container-basics/) | Container lifecycle, ports | 15 min |
| [Step 2](./step-2-build-your-first-image/) | Dockerfiles, building .NET 9 images | 15 min |
| [Step 3](./step-3-manual-networking/) | Networks, service discovery | 20 min |
| [Step 4](./step-4-docker-compose/) | Compose, microservices, React frontend | 20 min |
| [Step 5](./step-5-persistence/) | PostgreSQL, volumes, dev/prod configs | 25 min |

**Total:** ~95-115 minutes

---

## Tech Stack

- **Backend:** .NET 9 Minimal APIs
- **Database:** PostgreSQL 16
- **Frontend:** React 18 + Vite
- **Container:** Docker + Docker Compose
- **Architecture:** API Gateway Pattern

---

## How to Use This Repo

### Option 1: Follow in Order

Start at Step 1 and work through each step.

### Option 2: Jump to Any Step

Each step is self-contained. Jump to whichever step interests you.

### Stuck?

Every step has a `SOLUTION.md` with:
- All commands in copy-paste order
- Expected outputs
- Troubleshooting tips

---

## Quick Start (Skip to the Good Stuff)

Want to see the microservices running immediately?

```bash
# Full stack with PostgreSQL persistence
cd step-5-persistence
docker compose up -d --build

# Backend API
curl http://localhost:9000/health | jq

# Frontend Dashboard (includes Test Lab!)
open http://localhost:3000
```

Or for in-memory only (no database):

```bash
cd step-4-docker-compose
docker compose up -d --build
```

---

## What You'll Build

By the end, you'll have:

- **API Gateway** - Single entry point (.NET 9)
- **Users Service** - User management (.NET 9)
- **Orders Service** - Creates orders, validates against Users + Inventory (.NET 9)
- **Inventory Service** - Product management (.NET 9)
- **PostgreSQL** - Persistent data storage with volumes
- **Frontend Dashboard** - React admin interface with Test Lab

All talking to each other via Docker networking, with data that persists across restarts.

---

## Resources

- [Docker Docs](https://docs.docker.com)
- [.NET 9 Docs](https://learn.microsoft.com/dotnet)
- [Microservices Patterns](https://microservices.io)
- [12-Factor App](https://12factor.net)

---

## Files

| File | Description |
|------|-------------|
| [cheat-sheet.md](./cheat-sheet.md) | Quick command reference |
