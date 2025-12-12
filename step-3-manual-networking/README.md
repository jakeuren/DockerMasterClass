# Step 3: Manual Networking (The Hard Way)

**Time: ~20 minutes**

## Learning Objectives

By the end of this step, you will:
- Create Docker networks to connect containers
- Use Docker DNS for service discovery
- Build services that communicate with each other
- Understand why manual orchestration is painful (motivation for Docker Compose)

---

## Key Concepts

### Docker Networks

By default, containers are isolated and can't communicate with each other. To enable communication, we need to put them on the same network.

```
Without Network:              With Network:
┌──────────┐ ┌──────────┐    ┌─────────────────────────────┐
│Container │ │Container │    │      shop-network           │
│    A     │ │    B     │    │  ┌──────────┐ ┌──────────┐  │
└──────────┘ └──────────┘    │  │Container │◄──►Container│  │
      ✗ Can't talk           │  │    A     │ │    B     │  │
                             │  └──────────┘ └──────────┘  │
                             │         ✓ Can talk!         │
                             └─────────────────────────────┘
```

### Docker DNS Magic

Here's the powerful part: Docker provides **built-in DNS** on custom networks. Containers can find each other **by name** - no hardcoded IPs needed!

```
┌─────────────────────────────────────────────────┐
│                shop-network                      │
│                                                  │
│  ┌────────────────┐      ┌────────────────┐     │
│  │ users-service  │◄────►│ orders-service │     │
│  │   172.18.0.2   │      │   172.18.0.3   │     │
│  └────────────────┘      └────────────────┘     │
│                                                  │
│  Docker DNS automatically resolves:              │
│  "users-service" ──► 172.18.0.2                 │
│  "orders-service" ──► 172.18.0.3                │
│                                                  │
│  Services call: http://users-service:5001       │
│  (NOT: http://172.18.0.2:5001)                  │
└─────────────────────────────────────────────────┘
```

**Why this matters:**
- IPs change when containers restart - names don't
- Code doesn't need to know infrastructure details
- Same code works in dev, staging, production

### Internal vs External Services

Not every service needs to be accessible from outside Docker:

| Service Type | `-p` Flag? | Accessible From |
|-------------|------------|-----------------|
| Public API | Yes (`-p 9000:5000`) | Browser, curl, other machines |
| Internal Service | No | Only other containers on same network |

This is a security best practice - internal services have no attack surface from outside.

---

## The Architecture

We're building three microservices that need to communicate:

```
              ┌─────────────────────────────────────────────┐
              │              shop-network                    │
              │                                              │
              │  ┌────────────┐         ┌────────────┐      │
              │  │   Users    │         │ Inventory  │      │
              │  │  Service   │         │  Service   │      │
              │  │   :5001    │         │   :5003    │      │
              │  └─────▲──────┘         └──────▲─────┘      │
              │        │                       │            │
              │        │      ┌────────────┐   │            │
              │        └──────│   Orders   │───┘            │
              │               │  Service   │                │
              │               │   :5002    │                │
              │               └────────────┘                │
              │                                              │
              └──────────────────────────────────────────────┘
```

**Orders Service validates:**
1. "Does this user exist?" → Calls Users Service
2. "Is this item in stock?" → Calls Inventory Service

This is how real microservices work - they verify data across service boundaries.

---

## Hands-On Exercise

### Step 1: Create the Network

```bash
docker network create shop-network
```

Verify it exists:
```bash
docker network ls | grep shop
```

### Step 2: Build & Run Inventory Service

```bash
cd step-3-manual-networking/inventory-service

# Build the image
docker build -t inventory-service:v1 .

# Run it - notice: NO -p flag (internal only!)
docker run -d \
  --name inventory-service \
  --network shop-network \
  inventory-service:v1
```

### Step 3: Build & Run Users Service

```bash
cd ../users-service

docker build -t users-service:v1 .

docker run -d \
  --name users-service \
  --network shop-network \
  users-service:v1
```

### Step 4: Test Service Discovery

This is the magic moment! We'll use a temporary curl container to test that services can find each other by name:

```bash
# Test inventory service (notice: using service NAME, not IP!)
docker run --rm --network shop-network curlimages/curl \
  curl -s http://inventory-service:5003/health
```

Expected output:
```json
{"service": "inventory", "status": "healthy"}
```

```bash
# Test users service
docker run --rm --network shop-network curlimages/curl \
  curl -s http://users-service:5001/users
```

**Docker DNS resolved the service names to IP addresses automatically!**

### Step 5: Build & Run Orders Service

Orders is the complex one - it needs to know where to find the other services:

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

The `-e` flags pass **environment variables** to configure service URLs.

### Step 6: Test the Complete System

```bash
# Check all services are running
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test orders service health
docker run --rm --network shop-network curlimages/curl \
  curl -s http://orders-service:5002/health
```

---

## Feel the Pain

Stop and think about what we just did:

**To run 3 services, we needed:**
- 1 network create command
- 3 docker build commands
- 3 docker run commands (each with different flags)
- Remember exact environment variable names
- Run commands in the right order (can't start orders before users/inventory)

**What happens when:**
- You forget an environment variable? Service crashes
- You typo a service name? Connection refused
- A service crashes at 2 AM? You restart it manually
- You need to share this setup with a teammate? Send them a Word doc?
- You want to run 10 services? 30 commands?!

**This approach has serious problems:**
1. **Not reproducible** - Hard to remember exact commands
2. **Not declarative** - You're describing HOW, not WHAT
3. **No auto-restart** - Services stay dead
4. **No single view** - `docker ps` shows containers, not your "app"
5. **No easy cleanup** - Must remember all container names

**This is why Docker Compose exists.** It solves all of these problems.

---

## Quiz

Think about these questions:

- Why don't internal services need the `-p` flag?
- What would happen if you forgot `--network shop-network` on one container?
- Why use environment variables for service URLs instead of hardcoding them?
- How would you debug if orders-service couldn't reach users-service?
- What's the advantage of Docker DNS over hardcoding IP addresses?

---

## Cleanup

```bash
# Stop all services
docker stop inventory-service users-service orders-service

# Remove containers
docker rm inventory-service users-service orders-service

# Remove the network
docker network rm shop-network

# Remove images (optional)
docker rmi inventory-service:v1 users-service:v1 orders-service:v1
```

---

## What We Learned

| Concept | Command/Example | What It Does |
|---------|-----------------|--------------|
| Create network | `docker network create X` | Creates isolated network |
| Join network | `--network X` | Attaches container to network |
| Docker DNS | `http://container-name:port` | Resolves container names to IPs |
| Internal service | (no `-p` flag) | Not accessible from outside Docker |
| Environment vars | `-e KEY=value` | Configure container at runtime |
| Service discovery | Container names | Services find each other by name |

---

**Next:** [Step 4 - Docker Compose](../step-4-docker-compose/) - One file to rule them all!
