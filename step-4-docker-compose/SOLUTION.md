# Step 4: Solution

Copy-paste these commands in order.

---

## Launch the Stack

### 1. Navigate to step-4

```bash
cd step-4-docker-compose
```

### 2. Start everything

```bash
docker compose up -d --build
```

**Expected output:**
```
[+] Building 120.5s (60/60) FINISHED
...
[+] Running 6/6
 ✔ Network step-4-docker-compose_microservices-net  Created
 ✔ Container step-4-docker-compose-inventory-service-1  Started
 ✔ Container step-4-docker-compose-users-service-1      Started
 ✔ Container step-4-docker-compose-orders-service-1     Started
 ✔ Container step-4-docker-compose-api-gateway-1        Started
 ✔ Container step-4-docker-compose-frontend-1           Started
```

### 3. Check status

```bash
docker compose ps
```

**Expected output:**
```
NAME                                      STATUS
step-4-docker-compose-api-gateway-1       running
step-4-docker-compose-frontend-1          running
step-4-docker-compose-inventory-service-1 running
step-4-docker-compose-orders-service-1    running
step-4-docker-compose-users-service-1     running
```

---

## Test the Services

### 4. Open the Frontend

Open http://localhost:3000 in your browser.

**Expected:** Retro-terminal styled dashboard showing system health, users, inventory, and orders.

### 5. Health check (all services)

```bash
curl http://localhost:9000/health | jq
```

**Expected output:**
```json
{
  "status": "healthy",
  "services": {
    "gateway": "healthy",
    "users": "healthy",
    "orders": "healthy",
    "inventory": "healthy"
  }
}
```

### 6. Get users

```bash
curl http://localhost:9000/users | jq
```

**Expected output:**
```json
{
  "service": "users-service",
  "users": [
    {"id": "1", "name": "Alice", "email": "alice@example.com"},
    {"id": "2", "name": "Bob", "email": "bob@example.com"},
    {"id": "3", "name": "Charlie", "email": "charlie@example.com"}
  ],
  "count": 3
}
```

### 7. Get inventory

```bash
curl http://localhost:9000/inventory | jq
```

**Expected output:**
```json
{
  "service": "inventory-service",
  "items": [
    {"id": "ITEM001", "name": "Docker Handbook", "quantity": 50, "price": 29.99},
    {"id": "ITEM002", "name": "Container Stickers", "quantity": 200, "price": 4.99},
    {"id": "ITEM003", "name": "Kubernetes Mug", "quantity": 25, "price": 14.99},
    {"id": "ITEM004", "name": "DevOps T-Shirt", "quantity": 75, "price": 24.99}
  ],
  "count": 4
}
```

### 8. Get orders

```bash
curl http://localhost:9000/orders | jq
```

**Expected output:**
```json
{
  "service": "orders-service",
  "orders": [
    {
      "id": "ORD001",
      "userId": "1",
      "items": [{"itemId": "ITEM001", "quantity": 2}],
      "status": "completed",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

## Create an Order

### 9. Create a new order

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 2}]}' | jq
```

**Expected output:**
```json
{
  "id": "ORD...",
  "userId": "1",
  "items": [{"itemId": "ITEM001", "quantity": 2}],
  "status": "pending",
  "createdAt": "..."
}
```

---

## Test Failure Scenarios

### 10. Stop users service

```bash
docker compose stop users-service
```

### 11. Check health

```bash
curl http://localhost:9000/health | jq
```

**Expected output (users unreachable):**
```json
{
  "status": "degraded",
  "services": {
    "gateway": "healthy",
    "users": "unreachable",
    "orders": "healthy",
    "inventory": "healthy"
  }
}
```

### 12. Try creating an order (should fail)

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 1}]}' | jq
```

**Expected output:**
```json
{
  "error": "Users service unavailable"
}
```

### 13. Bring users back

```bash
docker compose start users-service
```

---

## Bonus Challenges

### Challenge 1: Invalid User

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "999", "items": [{"item_id": "ITEM001", "quantity": 1}]}' | jq
```

**Expected output:**
```json
{
  "error": "User not found"
}
```

### Challenge 2: Out of Stock

```bash
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 9999}]}' | jq
```

**Expected output:**
```json
{
  "error": "Insufficient stock for ITEM001"
}
```

### Challenge 3: Scale Users Service

```bash
docker compose up -d --scale users-service=3
docker compose ps
```

**Expected output:**
```
NAME                                        STATUS
step-4-docker-compose-users-service-1       running
step-4-docker-compose-users-service-2       running
step-4-docker-compose-users-service-3       running
...
```

---

## Cleanup

### 14. Tear it all down

```bash
docker compose down -v
```

**Expected output:**
```
[+] Running 6/6
 ✔ Container step-4-docker-compose-frontend-1           Removed
 ✔ Container step-4-docker-compose-api-gateway-1        Removed
 ✔ Container step-4-docker-compose-orders-service-1     Removed
 ✔ Container step-4-docker-compose-users-service-1      Removed
 ✔ Container step-4-docker-compose-inventory-service-1  Removed
 ✔ Network step-4-docker-compose_microservices-net      Removed
```

---

## If You're Stuck

### "Port 9000 already in use"

Something else is using port 9000:

```bash
lsof -i :9000
```

Either kill it or edit `compose.yml` to use a different port:

```yaml
api-gateway:
  ports:
    - "9001:5000"  # Use 9001 instead
```

### "Port 3000 already in use"

Edit `compose.yml`:

```yaml
frontend:
  ports:
    - "3001:80"  # Use 3001 instead
```

### Services won't start

Check the logs:

```bash
docker compose logs api-gateway
docker compose logs users-service
docker compose logs frontend
```

### "jq: command not found"

Remove `| jq` from commands, or install jq:

```bash
# Mac
brew install jq

# Ubuntu/Debian
sudo apt install jq
```

### Containers keep restarting

Check for errors:

```bash
docker compose logs --tail=50
```

### Network issues

Make sure no old networks are conflicting:

```bash
docker network prune
```

### Frontend shows connection errors

The frontend needs the API gateway running. Check:

```bash
docker compose ps api-gateway
```

---

## Understanding compose.yml

| Section | What It Does |
|---------|--------------|
| `services:` | Define your containers |
| `build:` | Build from Dockerfile in directory |
| `ports:` | Expose to host machine |
| `depends_on:` | Start order |
| `environment:` | Set env vars |
| `networks:` | Connect to network |

### Why Only Gateway and Frontend Have Ports?

Security! Internal services shouldn't be accessible from outside. All traffic goes through the gateway.

---

## Tech Stack Summary

| Service | Technology | Port |
|---------|------------|------|
| API Gateway | .NET 9 Minimal API | 9000 (external) |
| Users Service | .NET 9 Minimal API | 5001 (internal) |
| Orders Service | .NET 9 Minimal API | 5002 (internal) |
| Inventory Service | .NET 9 Minimal API | 5003 (internal) |
| Frontend | React + Vite + Nginx | 3000 (external) |
