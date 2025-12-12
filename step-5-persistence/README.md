# Step 5: Data Persistence with PostgreSQL

**Time: ~25 minutes**

## Learning Objectives

By the end of this step, you will:
- Add PostgreSQL to your microservices stack
- Use Docker volumes for data persistence
- Configure database health checks
- Understand compose override files for dev/prod environments
- Run comprehensive tests from the frontend
- Complete a full microservices architecture

---

## Key Concepts

### The Problem: Containers Are Ephemeral

Everything you've built so far has one critical flaw:

```bash
docker compose down
# ALL YOUR DATA IS GONE!
```

Containers are designed to be disposable. When a container stops, its filesystem changes disappear. This is usually good - it keeps containers clean and reproducible. But it's a disaster for databases!

```
Container Lifecycle:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Container     │     │   Container     │     │   Container     │
│   Running       │────►│   Stopped       │────►│   Removed       │
│                 │     │                 │     │                 │
│  Data: ✓        │     │  Data: ✓        │     │  Data: ✗ LOST!  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### The Solution: Named Volumes

Docker volumes store data **outside** the container's filesystem. The data persists even when containers are destroyed.

```
Without Volume:                 With Volume:
┌─────────────────┐            ┌─────────────────┐
│   Container     │            │   Container     │
│                 │            │        │        │
│   /data ──────┐ │            │   /data ────────┼───► postgres-data
│               │ │            │                 │     (named volume)
│    (inside    │ │            │                 │
│    container) │ │            └─────────────────┘
└───────────────┘ │
     Data dies ◄──┘                   Data survives! ✓
     with container
```

```yaml
volumes:
  postgres-data:    # Defined at compose level

services:
  postgres:
    volumes:
      - postgres-data:/var/lib/postgresql/data  # Mounted to container
```

### Database Health Checks

Services shouldn't start until the database is actually ready. Docker Compose supports health conditions:

```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d microservices"]
    interval: 5s
    timeout: 5s
    retries: 5

users-service:
  depends_on:
    postgres:
      condition: service_healthy  # Waits for health check to pass!
```

This prevents "connection refused" errors during startup.

### Compose Override Files

Docker Compose automatically merges `compose.yml` + `compose.override.yml`:

```
compose.yml           + compose.override.yml    = Final Config
(base config)           (dev additions)

postgres:               postgres:                 postgres:
  image: postgres         ports:                    image: postgres
                            - "5432:5432"           ports:
                                                      - "5432:5432"
```

This lets you:
- Keep production config in `compose.yml`
- Add dev tools (pgAdmin, exposed ports) in `compose.override.yml`
- Switch easily between environments

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DOCKER NETWORK                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────────────────────────┐          │
│   │   Frontend   │    │          PostgreSQL              │          │
│   │   (React)    │    │   ┌──────────────────────┐       │          │
│   │   :3000      │    │   │  postgres-data       │       │          │
│   └──────┬───────┘    │   │  (named volume)      │       │          │
│          │            │   └──────────────────────┘       │          │
│          ▼            └─────────────┬────────────────────┘          │
│   ┌──────────────┐                  │                               │
│   │ API Gateway  │                  │                               │
│   │    :9000     │◄─────────────────┼───────────────────┐           │
│   └──────┬───────┘                  │                   │           │
│          │                          │                   │           │
│   ┌──────┴──────────────────────────┴───────────────────┴────┐      │
│   │                                                          │      │
│   ▼                          ▼                          ▼    │      │
│ ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │      │
│ │   Users     │     │   Orders    │     │  Inventory  │     │      │
│ │   Service   │     │   Service   │     │   Service   │     │      │
│ │   :5001     │     │   :5002     │     │   :5003     │     │      │
│ └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     │      │
│        │                   │                   │            │      │
│        └───────────────────┴───────────────────┴────────────┘      │
│                            │                                        │
│                            ▼                                        │
│                    ┌──────────────┐                                 │
│                    │  PostgreSQL  │                                 │
│                    │    :5432     │                                 │
│                    └──────────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**6 services + 1 database with persistent storage**

---

## Hands-On Exercise

### Step 1: Explore the Files

```bash
cd step-5-persistence

# Look at the compose file
cat compose.yml

# Check the override file (dev settings)
cat compose.override.yml

# View database initialization script
cat database/init.sql
```

### Step 2: Start the Stack

```bash
# Start all services (includes dev overrides automatically)
docker compose up --build -d

# Watch the startup (PostgreSQL health checks!)
docker compose logs -f postgres
```

### Step 3: Verify Database Connection

```bash
# Check service health (includes DB status)
curl http://localhost:9000/health | jq

# Connect to PostgreSQL directly (dev mode only - port exposed)
docker compose exec postgres psql -U postgres -d microservices

# Inside psql:
\dt                      -- List tables
SELECT * FROM users;     -- Check seed data
SELECT * FROM inventory; -- Check inventory
\q                       -- Quit
```

### Step 4: Test Persistence

This is the key test - does data survive restarts?

```bash
# Create new data via API
curl -X POST http://localhost:9000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Persistence Test", "email": "test@example.com"}'

# Note the user ID in the response

# Restart EVERYTHING
docker compose restart

# Verify data survived!
curl http://localhost:9000/users | jq
```

The user you created is still there after the restart.

### Step 5: Run Tests from Frontend

1. Open http://localhost:3000
2. Navigate to **Test Lab** tab
3. Click **RUN ALL TESTS**
4. Watch all tests execute and pass

### Step 6: Explore Dev Tools (Optional)

```bash
# pgAdmin is available in dev mode
# Open http://localhost:5050
# Login: admin@example.com / admin
# Add server: host=postgres, user=postgres, password=postgres
```

---

## Test Scenarios in Frontend

| Category | Test | Description |
|----------|------|-------------|
| Connectivity | Health Check | Verify all services and DB connections |
| Users | Create User | Create with auto-generated email |
| Users | Create User (Invalid) | Validation: missing name |
| Users | Get User (Not Found) | 404 handling |
| Inventory | Create Item | Add new inventory item |
| Inventory | Duplicate Item | Validation: duplicate ID |
| Inventory | Reserve Stock | Reduce inventory |
| Inventory | Insufficient Stock | Validation: quantity check |
| Inventory | Restock | Add to inventory |
| Orders | Create Order | Full workflow with validation |
| Orders | Invalid User | Cross-service validation |
| Orders | Insufficient Stock | Cross-service validation |
| Database | Persistence Test | Create and verify data |

---

## Volume Management

```bash
# List volumes
docker volume ls

# Inspect a volume (see where data is stored)
docker volume inspect step-5-persistence_postgres-data

# View volume contents (advanced)
docker run --rm -v step-5-persistence_postgres-data:/data alpine ls -la /data

# DANGER: Remove all data
docker compose down -v
```

---

## Production Deployment

```bash
# Create .env file for production secrets
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD to something secure

# Start with production config (no dev tools, no exposed ports)
docker compose -f compose.yml -f compose.prod.yml up -d
```

---

## Quiz

Think about these questions:

- Why use named volumes instead of bind mounts for databases?
- What happens if PostgreSQL isn't ready when services start without health checks?
- How do override files help manage different environments?
- What's the difference between `docker compose down` and `docker compose down -v`?
- Why should you never expose the database port in production?

---

## Troubleshooting

**Database connection refused:**
```bash
# Check PostgreSQL is running
docker compose ps postgres
docker compose logs postgres
```

**Services starting before DB ready:**
```bash
# Verify health check
docker compose ps  # Look for "(healthy)" status
```

**Data not persisting:**
```bash
# Check volume exists
docker volume ls | grep postgres
# Ensure using named volume, not anonymous
```

---

## Cleanup

```bash
# Stop containers but keep data
docker compose down

# Stop and DELETE all data (careful!)
docker compose down -v
```

---

## Workshop Complete!

You've built a complete microservices architecture with:

```
The Journey:

Step 1: Containers     → Run single containers, understand lifecycle
         │
Step 2: Images         → Build your own .NET 9 images, multi-stage builds
         │
Step 3: Networking     → Connect containers, Docker DNS, feel the pain
         │
Step 4: Compose        → Orchestrate 5 services with one command
         │
Step 5: Persistence    → PostgreSQL + volumes, data survives restarts
```

---

## Patterns You Now Know

| Pattern | What It Means | Where We Used It |
|---------|---------------|------------------|
| API Gateway | Single entry point for all requests | api-gateway service |
| Service Discovery | Find services by name, not IP | Docker DNS |
| Network Isolation | Internal services hidden from outside | No `-p` on internal services |
| Health Checks | Services report their status | `/health` endpoints |
| Service-to-Service | Microservices call each other | Orders → Users, Inventory |
| Graceful Degradation | Handle failures cleanly | Health check shows unhealthy |
| Named Volumes | Data persists across restarts | postgres-data volume |
| Multi-Stage Builds | Smaller production images | SDK build → Runtime only |
| Environment Config | Configure via env vars | DATABASE_URL, service URLs |

---

## Key Commands Reference

```bash
# Containers
docker run -d -p 8080:80 --name web nginx    # Run container
docker ps                                     # List running
docker stop <name>                           # Stop container
docker rm -f <name>                          # Force remove
docker exec <name> <command>                 # Run command inside

# Images
docker build -t myapp:v1 .                   # Build image
docker images                                # List images
docker rmi <image>                           # Remove image

# Networks
docker network create <name>                 # Create network
docker network ls                            # List networks
docker run --network <name> ...              # Join network

# Compose
docker compose up -d --build                 # Build and start all
docker compose ps                            # List services
docker compose logs -f <service>             # Follow logs
docker compose stop <service>                # Stop one service
docker compose start <service>               # Start one service
docker compose restart                       # Restart all
docker compose down                          # Stop and remove
docker compose down -v                       # Stop, remove, delete volumes

# Volumes
docker volume ls                             # List volumes
docker volume inspect <name>                 # Volume details
docker volume rm <name>                      # Remove volume
```

---

## What's Next?

Now that you understand Docker fundamentals:

- **Docker Hub** - Push your images to a registry
- **Kubernetes** - Orchestrate containers at scale
- **CI/CD Pipelines** - Build images automatically
- **Service Mesh** - Advanced networking (Istio, Linkerd)
- **Monitoring** - Prometheus + Grafana for metrics

---

## Resources

- [docs.docker.com](https://docs.docker.com) - Official Docker documentation
- [microservices.io](https://microservices.io) - Microservices patterns
- [12factor.net](https://12factor.net) - Cloud-native app principles
- [labs.play-with-docker.com](https://labs.play-with-docker.com) - Free Docker playground

---

## Final Cleanup

```bash
cd step-5-persistence
docker compose down -v
```

---

**Congratulations!** You built a 6-service microservices architecture with PostgreSQL persistence.

```
Frontend → Gateway → Users/Orders/Inventory → PostgreSQL
```

Not bad for a workshop.
