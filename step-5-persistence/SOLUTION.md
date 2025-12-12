# Step 5: Solution Guide

## Quick Start

```bash
cd step-5-persistence

# Start the complete stack
docker compose up --build -d

# Wait for all services to be healthy
docker compose ps

# Open the frontend
# http://localhost:3000
```

## Expected Output

### Starting Services

```bash
$ docker compose up --build -d
[+] Building 45.2s (42/42) FINISHED
 => [api-gateway] ...
 => [users-service] ...
 => [orders-service] ...
 => [inventory-service] ...
 => [frontend] ...
[+] Running 7/7
 ✔ Network step-5-persistence_microservices-net  Created
 ✔ Volume "step-5-persistence_postgres-data"      Created
 ✔ Container step-5-persistence-postgres-1        Healthy
 ✔ Container step-5-persistence-users-service-1   Started
 ✔ Container step-5-persistence-inventory-service-1  Started
 ✔ Container step-5-persistence-orders-service-1  Started
 ✔ Container step-5-persistence-api-gateway-1     Started
 ✔ Container step-5-persistence-frontend-1        Started
 ✔ Container step-5-persistence-pgadmin-1         Started
```

### Check Service Status

```bash
$ docker compose ps
NAME                                    STATUS
step-5-persistence-api-gateway-1        Up
step-5-persistence-frontend-1           Up
step-5-persistence-inventory-service-1  Up
step-5-persistence-orders-service-1     Up
step-5-persistence-pgadmin-1            Up
step-5-persistence-postgres-1           Up (healthy)
step-5-persistence-users-service-1      Up
```

### Health Check

```bash
$ curl http://localhost:9000/health | jq
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

## API Commands Reference

### Users

```bash
# List all users
curl http://localhost:9000/users | jq

# Get specific user
curl http://localhost:9000/users/1 | jq

# Create user
curl -X POST http://localhost:9000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "New User", "email": "new@example.com"}' | jq

# Delete user (fails if user has orders)
curl -X DELETE http://localhost:9000/users/USER_ID | jq
```

### Inventory

```bash
# List inventory
curl http://localhost:9000/inventory | jq

# Get item
curl http://localhost:9000/inventory/ITEM001 | jq

# Create item
curl -X POST http://localhost:9000/inventory \
  -H "Content-Type: application/json" \
  -d '{"id": "ITEM005", "name": "New Product", "quantity": 50, "price": 19.99}' | jq

# Update item
curl -X PUT http://localhost:9000/inventory/ITEM001 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 100, "price": 34.99}' | jq

# Reserve stock
curl -X POST http://localhost:9000/inventory/ITEM001/reserve \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5}' | jq

# Restock
curl -X POST http://localhost:9000/inventory/ITEM001/restock \
  -H "Content-Type: application/json" \
  -d '{"quantity": 20}' | jq

# Delete item (fails if in orders)
curl -X DELETE http://localhost:9000/inventory/ITEM005 | jq
```

### Orders

```bash
# List orders
curl http://localhost:9000/orders | jq

# Get order details
curl http://localhost:9000/orders/ORD001 | jq

# Create order
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "1",
    "items": [{"item_id": "ITEM001", "quantity": 2}]
  }' | jq

# Update order status
curl -X PUT http://localhost:9000/orders/ORD001/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' | jq

# Delete order
curl -X DELETE http://localhost:9000/orders/ORD001 | jq
```

## Database Access

### Via psql (Development)

```bash
$ docker compose exec postgres psql -U postgres -d microservices

microservices=# \dt
           List of relations
 Schema |    Name     | Type  |  Owner
--------+-------------+-------+----------
 public | inventory   | table | postgres
 public | order_items | table | postgres
 public | orders      | table | postgres
 public | users       | table | postgres

microservices=# SELECT * FROM users;
 id |  name   |        email        |         created_at
----+---------+---------------------+----------------------------
 1  | Alice   | alice@example.com   | 2025-01-15 10:00:00.000000
 2  | Bob     | bob@example.com     | 2025-01-15 10:00:00.000000
 3  | Charlie | charlie@example.com | 2025-01-15 10:00:00.000000

microservices=# SELECT * FROM inventory;
   id    |       name        | quantity | price
---------+-------------------+----------+-------
 ITEM001 | Docker Handbook   |       50 | 29.99
 ITEM002 | Container Stickers|      200 |  4.99
 ITEM003 | Kubernetes Mug    |       25 | 14.99
 ITEM004 | DevOps T-Shirt    |       75 | 24.99

microservices=# \q
```

### Via pgAdmin (Development)

1. Open http://localhost:5050
2. Login: `admin@example.com` / `admin`
3. Add Server:
   - Name: `microservices`
   - Host: `postgres`
   - Port: `5432`
   - Database: `microservices`
   - Username: `postgres`
   - Password: `postgres`

## Testing Error Scenarios

### Invalid User Creation

```bash
$ curl -X POST http://localhost:9000/users \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'

{"error":"Name is required"}
```

### User Not Found

```bash
$ curl http://localhost:9000/users/nonexistent
{"error":"User not found"}
```

### Duplicate Inventory Item

```bash
$ curl -X POST http://localhost:9000/inventory \
  -H "Content-Type: application/json" \
  -d '{"id": "ITEM001", "name": "Duplicate", "quantity": 1, "price": 1}'

{"error":"Item ID already exists"}
```

### Insufficient Stock

```bash
$ curl -X POST http://localhost:9000/inventory/ITEM003/reserve \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1000}'

{"error":"Insufficient stock","available":25}
```

### Order with Invalid User

```bash
$ curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "fake", "items": [{"item_id": "ITEM001", "quantity": 1}]}'

{"error":"User not found"}
```

### Order with Insufficient Stock

```bash
$ curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 9999}]}'

{"error":"Insufficient stock for ITEM001"}
```

## Persistence Verification

```bash
# Create test data
curl -X POST http://localhost:9000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Persistence Test"}'

# Restart stack
docker compose restart

# Verify data persists
curl http://localhost:9000/users | jq '.users[] | select(.name == "Persistence Test")'
```

## Volume Operations

```bash
# List volumes
docker volume ls

# Inspect data volume
docker volume inspect step-5-persistence_postgres-data

# Backup database
docker compose exec postgres pg_dump -U postgres microservices > backup.sql

# Complete cleanup (removes all data!)
docker compose down -v
```

## Production Mode

```bash
# Create env file
echo "POSTGRES_PASSWORD=supersecretpassword" > .env

# Start with production config
docker compose -f compose.yml -f compose.prod.yml up -d

# Note: In production mode
# - No pgAdmin
# - No exposed service ports (only 9000, 3000)
# - Resource limits applied
# - Restart policies enabled
```

## Cleanup

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (deletes all data)
docker compose down -v

# Remove built images
docker compose down --rmi local
```
