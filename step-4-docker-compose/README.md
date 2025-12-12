# Step 4: Docker Compose

**Time: ~20 minutes**

## Learning Objectives

By the end of this step, you will:
- Use Docker Compose to orchestrate multiple services
- Understand the API Gateway pattern
- See real microservices communicating in action
- Learn about graceful degradation when services fail

---

## Key Concepts

### From Pain to Simplicity

Remember Step 3? We needed:
- 1 network create command
- 3 docker build commands
- 3 docker run commands with environment variables
- Manual restart when things crashed

**Docker Compose reduces this to one file and one command.**

```
BEFORE (Step 3):                    AFTER (Step 4):
─────────────────                   ───────────────
docker network create               compose.yml +
docker build ...                    docker compose up -d --build
docker build ...
docker build ...
docker run -d --name ... -e ...
docker run -d --name ... -e ...
docker run -d --name ... -e ...

15+ commands                        1 file, 1 command
```

### The API Gateway Pattern

In microservices, you don't expose every service to the outside world. Instead, you use an **API Gateway** - a single entry point that routes requests to internal services.

```
       External Traffic
              │
              ▼
┌─────────────────────────────────────────────────────┐
│                  PUBLIC ZONE                         │
│   ┌─────────────┐      ┌─────────────────────────┐  │
│   │  Frontend   │      │      API Gateway        │  │
│   │  :3000      │─────►│        :9000            │  │
│   └─────────────┘      └───────────┬─────────────┘  │
└────────────────────────────────────│────────────────┘
                                     │
┌────────────────────────────────────│────────────────┐
│                 INTERNAL ZONE (no external access)  │
│                                    │                │
│         ┌──────────────────────────┼────────┐       │
│         │                          │        │       │
│         ▼                          ▼        ▼       │
│   ┌───────────┐            ┌───────────┐┌────────┐  │
│   │  Users    │            │  Orders   ││Inventory│  │
│   │  :5001    │            │  :5002    ││ :5003  │  │
│   └───────────┘            └───────────┘└────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Why use an API Gateway?**

| Benefit | Explanation |
|---------|-------------|
| Security | Internal services can't be attacked directly |
| Simplicity | Clients only need to know one URL |
| Flexibility | Can add authentication, rate limiting, logging in one place |
| Abstraction | Internal service structure can change without affecting clients |

### Compose File Structure

```yaml
services:           # Define what to run
  api-gateway:
    build: ./api-gateway
    ports:
      - "9000:5000"
    depends_on:     # Start order
      - users-service
    environment:    # Configuration
      - USERS_SERVICE_URL=http://users-service:5001

networks:           # Define connectivity
  microservices-net:

volumes:            # Define persistence (Step 5)
  postgres-data:
```

### Service Dependencies

Docker Compose handles startup order with `depends_on`:

```yaml
orders-service:
  depends_on:
    - users-service      # Starts users first
    - inventory-service  # Starts inventory first
```

---

## The Architecture

```
                    ┌──────────┐
                    │   You    │
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              │    Frontend         │  :3000 (React Dashboard)
              │    (React/Vite)     │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │   API Gateway       │  :9000 (only backend exposed!)
              │    (.NET 9)         │
              └────────┬────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│   Users    │  │   Orders   │  │ Inventory  │
│  Service   │  │  Service   │  │  Service   │
│   :5001    │  │   :5002    │  │   :5003    │
└────────────┘  └─────┬──────┘  └────────────┘
                      │
               (calls Users AND
                Inventory!)
```

5 services. Only the frontend and gateway are publicly accessible.

---

## Hands-On Exercise

### Step 1: Launch Everything

```bash
cd step-4-docker-compose

# One command to build and start all services!
docker compose up -d --build
```

Watch the build process - each service builds in parallel where possible.

### Step 2: Check Status

```bash
docker compose ps
```

You should see 5 services running:
- frontend
- api-gateway
- users-service
- orders-service
- inventory-service

### Step 3: Explore the Frontend

Open http://localhost:3000 in your browser.

You'll see a retro-terminal styled dashboard with:
- System health status (shows all services)
- Users list (from users-service)
- Inventory list (from inventory-service)
- Orders section (orchestrates multiple services)

### Step 4: Test the API Endpoints

```bash
# Health check - aggregates status from ALL services
curl http://localhost:9000/health | jq

# Get Users
curl http://localhost:9000/users | jq

# Get Inventory
curl http://localhost:9000/inventory | jq

# Get Orders
curl http://localhost:9000/orders | jq
```

### Step 5: Create an Order

This is where microservices get interesting - creating an order triggers a cascade of service calls:

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 2}]}'
```

**What Just Happened?**

```
1. Request ────────────► API Gateway (:9000)
                              │
2. Gateway forwards ──────────► Orders Service (:5002)
                                    │
3. Orders validates user ───────────► Users Service (:5001)
                                    │     "Does user 1 exist?"
                                    │     Response: Yes ✓
                                    │
4. Orders checks stock ─────────────► Inventory Service (:5003)
                                    │     "Is ITEM001 in stock?"
                                    │     Response: Yes ✓
                                    │
5. Order created! ◄─────────────────┘

6. Response ◄────────── Gateway ◄──── Orders Service

Four services coordinating for one request!
```

### Step 6: Test Graceful Degradation

What happens when a service goes down?

```bash
# Stop the users service
docker compose stop users-service

# Check system health
curl http://localhost:9000/health | jq
```

You'll see users-service is unhealthy! Now try creating an order:

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 1}]}'
```

The system handles the failure gracefully - you get an error message, not a crash.

```bash
# Bring it back
docker compose start users-service

# Health is restored
curl http://localhost:9000/health | jq
```

---

## Bonus Challenges

### Challenge 1: Invalid User

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "999", "items": [{"item_id": "ITEM001", "quantity": 1}]}'
```

The system validates that the user exists before creating an order.

### Challenge 2: Out of Stock

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 9999}]}'
```

The system checks inventory before allowing orders.

### Challenge 3: Scale a Service

```bash
# Run 3 instances of users-service!
docker compose up -d --scale users-service=3

# See all instances
docker compose ps
```

Docker's load balancing distributes requests across instances. This is horizontal scaling!

### Challenge 4: View Logs

```bash
# All services
docker compose logs

# Follow specific service
docker compose logs -f orders-service

# Last 50 lines
docker compose logs --tail 50
```

---

## Quiz

Think about these questions:

- Why does the API Gateway expose port 9000 but internal services don't expose any ports?
- What's the difference between `docker compose up` and `docker compose up --build`?
- How does orders-service know where to find users-service? (Hint: check the compose.yml environment variables)
- What would happen if you scaled orders-service but not the services it depends on?
- Why is it important that health checks fail gracefully instead of crashing?

---

## Cleanup

```bash
# Stop and remove all containers, networks
docker compose down

# Also remove volumes (if any)
docker compose down -v
```

---

## What We Learned

| Concept | What It Means |
|---------|---------------|
| Docker Compose | Define multi-container apps in one YAML file |
| `docker compose up -d --build` | Build and start all services in background |
| `docker compose ps` | View status of all services |
| `docker compose logs` | View output from services |
| `docker compose down` | Stop and remove everything |
| API Gateway | Single entry point that routes to internal services |
| `depends_on` | Control service startup order |
| `--scale` | Run multiple instances of a service |
| Graceful degradation | System continues working when parts fail |
| Service-to-service | Microservices validate data across boundaries |

---

## The Journey So Far

```
Step 1: Containers     → Run single containers
Step 2: Images         → Build your own images
Step 3: Networking     → Connect containers (the hard way)
Step 4: Compose        → Orchestrate multiple services (the easy way)

What's missing? Data persistence!
```

Restart your compose stack and all data is gone. That's a problem for databases.

---

**Next:** [Step 5 - Persistence](../step-5-persistence/) - Adding PostgreSQL and making data survive restarts
