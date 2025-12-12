# Step 1: Solution

Copy-paste these commands in order. Expected outputs shown after each.

---

## Container Lifecycle

### 1. Run a container

```bash
docker run -d --name speedster nginx:alpine
```

**Expected output:**
```
Unable to find image 'nginx:alpine' locally
alpine: Pulling from library/nginx
...
Status: Downloaded newer image for nginx:alpine
a1b2c3d4e5f6...  (container ID)
```

### 2. Check it's running

```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE          COMMAND                  STATUS         NAMES
a1b2c3d4e5f6   nginx:alpine   "/docker-entrypoint.…"   Up 5 seconds   speedster
```

### 3. Peek inside

```bash
docker exec speedster sh -c "echo 'Hello from inside!' > /usr/share/nginx/html/hello.txt"
docker exec speedster cat /usr/share/nginx/html/hello.txt
```

**Expected output:**
```
Hello from inside!
```

### 4. Stop the container

```bash
docker stop speedster
```

**Expected output:**
```
speedster
```

### 5. Restart it

```bash
docker start speedster
```

**Expected output:**
```
speedster
```

### 6. Remove it

```bash
docker rm -f speedster
```

**Expected output:**
```
speedster
```

---

## Port Publishing

### 1. Run nginx with port mapping

```bash
docker run -d -p 8080:80 --name webserver nginx:alpine
```

### 2. Test in browser

Open: http://localhost:8080

**Expected:** "Welcome to nginx!" page

### 3. Cleanup

```bash
docker rm -f webserver
```

---

## If You're Stuck

### "Cannot connect to the Docker daemon"

Docker Desktop isn't running. Start it!

- **Mac/Windows:** Open Docker Desktop app
- **Linux:** `sudo systemctl start docker`

### "Port 8080 is already in use"

Something else is using port 8080. Either:

```bash
# Use a different port
docker run -d -p 8081:80 --name webserver nginx:alpine
```

Or find and kill what's using 8080:

```bash
lsof -i :8080
kill -9 <PID>
```

### "Name already in use"

You have an old container with that name:

```bash
docker rm -f speedster
docker rm -f webserver
```

---

## Quiz Answers

- **What does `-d` do?** Runs container in detached mode (background)
- **What does `8080:80` mean?** Forward host port 8080 to container port 80
- **What if port 8080 is already in use?** Error! Use a different host port.
