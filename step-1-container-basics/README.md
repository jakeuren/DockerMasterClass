# Step 1: Container Basics

**Time: ~15 minutes**

## Learning Objectives

By the end of this step, you will:
- Understand how containers differ from virtual machines
- Master the container lifecycle (run, stop, start, remove)
- Publish container ports to access services from your browser
- Peek inside running containers

No code files needed - just Docker commands!

---

## Key Concepts

### VMs vs Containers

Before containers, we used virtual machines. Here's why containers changed everything:

| Virtual Machines | Containers |
|-----------------|------------|
| Minutes to boot | Seconds to boot |
| Gigabytes in size | Megabytes in size |
| Full OS per VM | Shared OS kernel |
| Heavy resource usage | Lightweight |
| Hardware virtualization | Process isolation |

**Containers give you 90% of VM benefits at 10% of the weight.**

### The Container Philosophy

> "Containers are cattle, not pets."

What does this mean?
- **Pets:** You name them, care for them, nurse them back to health when sick
- **Cattle:** Numbered, replaceable, easily created and destroyed

Containers are designed to be disposable. Don't get attached! If one breaks, kill it and start a new one.

---

## The Container Lifecycle

```
  docker run          docker stop         docker rm
      │                   │                   │
      ▼                   ▼                   ▼
   CREATED ───────► RUNNING ───────► STOPPED ───────► REMOVED
                        │                 │
                        │    docker start │
                        │◄────────────────┘
```

### Create and Run a Container

```bash
docker run -d --name speedster nginx:alpine
```

Let's break down this command:
- `docker run` - Create and start a new container
- `-d` - **Detached mode** (runs in background, gives you your terminal back)
- `--name speedster` - Give it a friendly name (otherwise Docker assigns a random one)
- `nginx:alpine` - The image to use (nginx web server on Alpine Linux)

### Check It's Running

```bash
docker ps
```

You'll see output like:
```
CONTAINER ID   IMAGE          STATUS         PORTS    NAMES
abc123def456   nginx:alpine   Up 2 minutes   80/tcp   speedster
```

### Peek Inside

You can execute commands inside a running container:

```bash
# Create a file inside the container
docker exec speedster sh -c "echo 'Hello from inside!' > /usr/share/nginx/html/hello.txt"

# Read it back
docker exec speedster cat /usr/share/nginx/html/hello.txt
```

The `exec` command runs a command in an **already running** container. Think of it as SSH-ing into a server.

### Stop, Start, Remove

```bash
docker stop speedster    # Gracefully stop (sends SIGTERM, then SIGKILL)
docker start speedster   # Start a stopped container
docker rm -f speedster   # Force remove (even if running)
```

---

## Port Publishing

### The Problem

Containers are **isolated by default**. The nginx server inside our container is listening on port 80, but we can't reach it from our browser. Why?

```
Your Machine                    Container
┌────────────────┐             ┌────────────────┐
│                │      ✗      │  nginx :80     │
│  Browser       │─────────────│                │
│                │   blocked!  │                │
└────────────────┘             └────────────────┘
```

### The Solution: Port Publishing

We need to "publish" a port - create a tunnel from our machine into the container:

```
Your Machine                    Container
┌────────────────┐             ┌────────────────┐
│                │             │                │
│  localhost:8080│─────────────│  nginx :80     │
│                │   tunnel!   │                │
└────────────────┘             └────────────────┘
```

### Run nginx with Port Publishing

```bash
docker run -d -p 8080:80 --name webserver nginx:alpine
```

The magic is `-p 8080:80`:
- **8080** - Port on YOUR machine (the "host")
- **80** - Port INSIDE the container
- Format: `-p HOST:CONTAINER`

Think of it as: "Forward my port 8080 to the container's port 80"

### Test It

Open your browser to: **http://localhost:8080**

You should see "Welcome to nginx!"

Alternatively, use curl:
```bash
curl http://localhost:8080
```

### View Container Logs

```bash
docker logs webserver
```

You'll see nginx access logs - every request you made!

---

## Hands-On Exercise

Try these commands in order:

```bash
# 1. Run a container with port publishing
docker run -d -p 8080:80 --name web nginx:alpine

# 2. Visit http://localhost:8080 in your browser

# 3. Check it's running
docker ps

# 4. View the logs
docker logs web

# 5. Stop the container
docker stop web

# 6. Try to access http://localhost:8080 - it won't work!

# 7. Start it again
docker start web

# 8. Try http://localhost:8080 again - it's back!

# 9. Clean up
docker rm -f web
```

---

## Quiz

Think about these questions:

- What does `-d` do and why would you want it?
- In `-p 8080:80`, which port is on your machine?
- What if port 8080 is already in use on your machine?
- What's the difference between `docker stop` and `docker rm -f`?

---

## Discussion

> "If you wanted to run FOUR different services that needed to talk to each other, how would you do it with what you know so far?"

Think about:
- How would each service find the others?
- How would you manage all those `docker run` commands?
- What happens when one service needs to restart?

We'll feel this pain in Step 3, then solve it in Step 4.

---

## Cleanup

```bash
docker rm -f speedster webserver web 2>/dev/null
```

---

## What We Learned

| Concept | Command | What It Does |
|---------|---------|--------------|
| Run container | `docker run -d --name X image` | Create and start container |
| List containers | `docker ps` | Show running containers |
| Execute command | `docker exec X command` | Run command in container |
| View logs | `docker logs X` | Show container output |
| Stop container | `docker stop X` | Gracefully stop |
| Start container | `docker start X` | Start stopped container |
| Remove container | `docker rm -f X` | Force remove container |
| Port publish | `-p 8080:80` | Forward host:container ports |

---

**Next:** [Step 2 - Build Your First Image](../step-2-build-your-first-image/)
