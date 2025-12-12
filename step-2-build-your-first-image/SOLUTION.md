# Step 2: Solution

Copy-paste these commands in order. Expected outputs shown after each.

---

## Build the Image

### 1. Navigate to step-2

```bash
cd step-2-build-your-first-image/hello-api
```

### 2. Build the image

```bash
docker build -t hello-api .
```

**Expected output:**
```
[+] Building 45.2s (14/14) FINISHED
 => [build 1/6] FROM mcr.microsoft.com/dotnet/sdk:9.0
 => [build 2/6] WORKDIR /src
 => [build 3/6] COPY *.csproj ./
 => [build 4/6] RUN dotnet restore
 => [build 5/6] COPY . ./
 => [build 6/6] RUN dotnet publish -c Release -o /app
 => [stage-1 1/2] FROM mcr.microsoft.com/dotnet/aspnet:9.0
 => [stage-1 2/2] COPY --from=build /app ./
 => exporting to image
 => => naming to docker.io/library/hello-api
```

### 3. Verify the image

```bash
docker images hello-api
```

**Expected output:**
```
REPOSITORY   TAG       IMAGE ID       CREATED          SIZE
hello-api    latest    abc123def456   10 seconds ago   ~220MB
```

---

## Run the Container

### 4. Run it

```bash
docker run -d -p 8080:5000 --name hello hello-api
```

**Expected output:**
```
a1b2c3d4e5f6... (container ID)
```

### 5. Test the endpoints

```bash
curl http://localhost:8080
```

**Expected output:**
```json
{
  "message": "Hello from .NET 9 in Docker!",
  "hostname": "a1b2c3d4e5f6",
  "timestamp": "2025-01-15T10:30:00.0000000Z"
}
```

```bash
curl http://localhost:8080/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "uptime": "00:00:15",
  "hostname": "a1b2c3d4e5f6"
}
```

```bash
curl http://localhost:8080/info
```

**Expected output:**
```json
{
  "runtime": ".NET 9.0.0",
  "os": "Linux ...",
  "hostname": "a1b2c3d4e5f6",
  "processId": 1
}
```

---

## Multiple Instances

### 6. Run more containers

```bash
docker run -d -p 8081:5000 --name hello2 hello-api
docker run -d -p 8082:5000 --name hello3 hello-api
```

### 7. Compare hostnames

```bash
curl -s http://localhost:8080 | grep hostname
curl -s http://localhost:8081 | grep hostname
curl -s http://localhost:8082 | grep hostname
```

**Expected output (different hostnames!):**
```
"hostname": "a1b2c3d4e5f6"
"hostname": "b2c3d4e5f6a7"
"hostname": "c3d4e5f6a7b8"
```

---

## Cleanup

### 8. Remove containers

```bash
docker rm -f hello hello2 hello3
```

### 9. Remove image (optional)

```bash
docker rmi hello-api
```

---

## If You're Stuck

### "Cannot find dockerfile"

Make sure you're in the right directory:

```bash
ls Dockerfile
```

If not found:

```bash
cd step-2-build-your-first-image/hello-api
```

### "Port 8080 is already in use"

Use a different port:

```bash
docker run -d -p 8090:5000 --name hello hello-api
curl http://localhost:8090
```

### "Name already in use"

Remove the old container:

```bash
docker rm -f hello
```

### Build is slow

First build downloads base images (~1GB). Subsequent builds use cache and are much faster.

---

## Quiz Answers

- **Why copy `*.csproj` first?** Layer caching. Dependencies change less often than code, so we restore them in a separate layer.
- **`RUN` vs `ENTRYPOINT`?** `RUN` executes during build, `ENTRYPOINT` executes when container starts.
- **Why multi-stage?** Smaller final image. We don't need the SDK (compilers, tools) at runtime.
