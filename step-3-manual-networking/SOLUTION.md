# Step 3: Solution

Copy-paste these commands in order.

---

## Setup

### 1. Create the network

```bash
docker network create shop-network
```

**Expected output:**
```
a1b2c3d4e5f6...  (network ID)
```

### 2. Verify network exists

```bash
docker network ls
```

**Expected output (includes):**
```
NETWORK ID     NAME           DRIVER
...
abc123...      shop-network   bridge
```

---

## Build & Run Services

### 3. Build and run inventory-service

```bash
cd step-3-manual-networking/inventory-service

docker build -t inventory-service:v1 .

docker run -d \
  --name inventory-service \
  --network shop-network \
  inventory-service:v1
```

### 4. Build and run users-service

```bash
cd ../users-service

docker build -t users-service:v1 .

docker run -d \
  --name users-service \
  --network shop-network \
  users-service:v1
```

### 5. Verify both are running

```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                  STATUS         NAMES
abc123...      users-service:v1       Up 5 seconds   users-service
def456...      inventory-service:v1   Up 30 seconds  inventory-service
```

---

## Test Service Discovery

### 6. Test inventory-service

```bash
docker run --rm --network shop-network curlimages/curl \
  curl -s http://inventory-service:5003/health
```

**Expected output:**
```json
{"service":"inventory","status":"healthy"}
```

### 7. Test users-service

```bash
docker run --rm --network shop-network curlimages/curl \
  curl -s http://users-service:5001/users
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

### 8. Get inventory items

```bash
docker run --rm --network shop-network curlimages/curl \
  curl -s http://inventory-service:5003/inventory
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

---

## Build & Run Orders Service

### 9. Build and run orders-service

```bash
cd ../orders-service

docker build -t orders-service:v1 .

docker run -d \
  --name orders-service \
  --network shop-network \
  -e USERS_SERVICE_URL=http://users-service:5001 \
  -e INVENTORY_SERVICE_URL=http://inventory-service:5003 \
  orders-service:v1
```

### 10. Test orders-service

```bash
docker run --rm --network shop-network curlimages/curl \
  curl -s http://orders-service:5002/health
```

**Expected output:**
```json
{"service":"orders","status":"healthy"}
```

---

## All Services Running

### 11. Verify all three

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Expected output:**
```
NAMES               STATUS         PORTS
orders-service      Up 1 minute
users-service       Up 2 minutes
inventory-service   Up 3 minutes
```

Note: No ports exposed! These are internal services.

---

## Cleanup

### 12. Stop and remove everything

```bash
docker stop inventory-service users-service orders-service
docker rm inventory-service users-service orders-service
docker network rm shop-network
```

Or the quick way:

```bash
docker rm -f inventory-service users-service orders-service
docker network rm shop-network
```

---

## If You're Stuck

### "Network shop-network not found"

Create it first:

```bash
docker network create shop-network
```

### "Name already in use"

Remove the old container:

```bash
docker rm -f inventory-service
docker rm -f users-service
docker rm -f orders-service
```

### Service can't reach another service

Check they're on the same network:

```bash
docker network inspect shop-network
```

Look for all three containers in the "Containers" section.

### "Could not resolve host"

Make sure you're using the correct service name (case-sensitive):
- `inventory-service` (not `inventory_service`)
- `users-service` (not `user-service`)

### curl command not working

Make sure you're including `--network shop-network`:

```bash
docker run --rm --network shop-network curlimages/curl \
  curl -s http://inventory-service:5003/health
```

---

## What We Learned

| Concept | What It Means |
|---------|---------------|
| Docker Network | Isolated network for containers |
| Service Discovery | Find containers by name via DNS |
| Internal Services | No `-p` = only accessible within network |
| Environment Variables | Pass config to containers with `-e` |
