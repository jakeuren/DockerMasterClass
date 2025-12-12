# Docker Cheat Sheet

> Print this double-sided for workshop participants!

---

## Container Lifecycle

```bash
# Run a container
docker run -d -p 8080:80 --name web nginx

# List containers
docker ps          # Running only
docker ps -a       # All (including stopped)

# Stop/Start/Restart
docker stop web
docker start web
docker restart web

# Remove container
docker rm web           # Must be stopped
docker rm -f web        # Force remove running

# View logs
docker logs web         # All logs
docker logs -f web      # Follow (live tail)
docker logs --tail 50 web  # Last 50 lines

# Execute command in container
docker exec -it web bash    # Interactive shell
docker exec web ls /app     # One-off command
```

---

## Images

```bash
# List images
docker images

# Pull an image
docker pull nginx:alpine

# Build from Dockerfile
docker build -t myapp:v1 .
docker build -t myapp:v1 -f Dockerfile.prod .

# Tag an image
docker tag myapp:v1 myregistry/myapp:v1

# Push to registry
docker push myregistry/myapp:v1

# Remove image
docker rmi nginx:alpine
docker rmi -f nginx:alpine  # Force
```

---

## Docker Compose

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# View service status
docker compose ps

# View logs
docker compose logs
docker compose logs -f web    # Follow one service

# Scale a service
docker compose up -d --scale web=3

# Rebuild images
docker compose build
docker compose up -d --build  # Build & start
```

---

## Networks

```bash
# List networks
docker network ls

# Create network
docker network create mynet

# Run container on network
docker run -d --network mynet --name web nginx

# Connect existing container
docker network connect mynet web

# Inspect network
docker network inspect mynet
```

---

## Volumes

```bash
# List volumes
docker volume ls

# Create volume
docker volume create mydata

# Run with volume
docker run -d -v mydata:/app/data nginx

# Bind mount (host directory)
docker run -d -v $(pwd)/data:/app/data nginx

# Inspect volume
docker volume inspect mydata

# Remove unused volumes
docker volume prune
```

---

## Cleanup Commands

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune

# Nuclear option (removes ALL unused)
docker system prune -a --volumes
```

---

## Dockerfile Quick Reference

```dockerfile
# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy files
COPY requirements.txt .
COPY . .

# Run commands (build time)
RUN pip install -r requirements.txt
RUN apt-get update && apt-get install -y curl

# Environment variables
ENV FLASK_ENV=production
ENV PORT=5000

# Expose port (documentation)
EXPOSE 5000

# Default command
CMD ["python", "app.py"]

# Alternative: entrypoint + cmd
ENTRYPOINT ["python"]
CMD ["app.py"]
```

---

## Common Flags

| Flag | Meaning |
|------|---------|
| `-d` | Detached (background) |
| `-it` | Interactive + TTY |
| `-p 8080:80` | Port: host:container |
| `-v data:/app` | Volume mount |
| `--name web` | Container name |
| `--rm` | Remove after exit |
| `--network net` | Connect to network |
| `-e VAR=val` | Environment variable |
| `--restart always` | Auto-restart policy |

---

## Troubleshooting

```bash
# Container won't start?
docker logs <container>

# What's running inside?
docker exec -it <container> sh
docker exec <container> ps aux

# Port conflict?
docker ps --format "{{.Ports}}"
lsof -i :8080

# Out of disk space?
docker system df
docker system prune -a

# Inspect everything
docker inspect <container>
docker inspect <image>
```

---

## Quick Recipes

**Run MySQL with data persistence:**
```bash
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mysql_data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8
```

**Run PostgreSQL:**
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -v pg_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15
```

**Run Redis:**
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine
```

---

## Microservices Commands

**Testing services through API Gateway (port 9000):**
```bash
# Health check (aggregates all services)
curl http://localhost:9000/health | jq

# List users
curl http://localhost:9000/users | jq

# Get specific user
curl http://localhost:9000/users/1 | jq

# List inventory
curl http://localhost:9000/inventory | jq

# Get specific item
curl http://localhost:9000/inventory/ITEM001 | jq

# List orders
curl http://localhost:9000/orders | jq

# Create an order (calls Users + Inventory!)
curl -X POST http://localhost:9000/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": "1", "items": [{"item_id": "ITEM001", "quantity": 2}]}' | jq
```

**Service-to-service testing (from inside network):**
```bash
# Test internal services using curl container
docker run --rm --network microservices-net curlimages/curl \
  curl -s http://users-service:5001/users

docker run --rm --network microservices-net curlimages/curl \
  curl -s http://inventory-service:5003/inventory
```

**Microservices patterns demonstrated:**
| Pattern | Implementation |
|---------|---------------|
| API Gateway | Single entry point (port 9000) |
| Service Discovery | Docker DNS (service names) |
| Network Isolation | No ports exposed for internal services |
| Health Checks | `/health` endpoints |
| Environment Config | Service URLs via env vars |

---

**Workshop Resources:**
- Docs: https://docs.docker.com
- Play with Docker: https://labs.play-with-docker.com
- Docker Hub: https://hub.docker.com
- Microservices Patterns: https://microservices.io
