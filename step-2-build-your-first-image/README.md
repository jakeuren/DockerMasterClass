# Step 2: Build Your First Image

**Time: ~15 minutes**

## Learning Objectives

By the end of this step, you will:
- Understand the difference between images and containers
- Write a Dockerfile for .NET 9 applications
- Use multi-stage builds to create smaller images
- Run multiple containers from the same image

---

## Key Concepts

### Image vs Container

This is the most important concept to understand:

- **Image** = A recipe (read-only blueprint)
- **Container** = A cake (running instance of the recipe)

```
        IMAGE (hello-api)
              │
         docker run
              │
     ┌────────┴────────┐
     ▼                 ▼
 Container         Container
  (hello)          (hello2)
 hostname:abc     hostname:xyz
```

**Key insight:** You can create many containers from one image. Each container is isolated and gets its own hostname, filesystem, and network.

This is how Netflix, Spotify, and every major tech company scales - they don't run one big server, they run hundreds of small identical containers.

### What's Inside an Image?

An image contains everything needed to run your app:
- Operating system files (usually a minimal Linux)
- Runtime (like .NET, Node.js, Python)
- Your application code
- Dependencies
- Configuration

Images are built in **layers**. Each instruction in a Dockerfile creates a layer. Layers are cached, which makes rebuilds fast.

---

## The Dockerfile

A Dockerfile is a recipe - a text file with instructions for building an image.

### Multi-Stage Build Example

Look at `hello-api/Dockerfile`:

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o /app

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "HelloApi.dll"]
```

### What Each Line Does

| Instruction | What It Does |
|-------------|--------------|
| `FROM sdk:9.0 AS build` | Start from .NET SDK image, name this stage "build" |
| `WORKDIR /src` | Set working directory inside container |
| `COPY *.csproj ./` | Copy project file first (for dependency caching) |
| `RUN dotnet restore` | Download NuGet packages |
| `COPY . ./` | Copy all source code |
| `RUN dotnet publish` | Compile the application |
| `FROM aspnet:9.0` | Start fresh with smaller runtime image |
| `COPY --from=build` | Copy compiled app from build stage |
| `ENV` | Set environment variables |
| `EXPOSE 5000` | Document which port the app uses |
| `ENTRYPOINT` | Command to run when container starts |

### Why Multi-Stage Builds?

```
SDK Image:     ~900 MB  (compilers, build tools, everything)
Runtime Image: ~220 MB  (just enough to run apps)
```

Multi-stage builds give you the best of both worlds:
- **Stage 1:** Use the full SDK to compile your code
- **Stage 2:** Copy only the compiled output to a tiny runtime image

Your final image is **4x smaller**! This means:
- Faster deployments
- Less disk space
- Smaller attack surface (fewer packages = fewer vulnerabilities)

---

## Build the Image

```bash
cd step-2-build-your-first-image/hello-api

docker build -t hello-api .
```

Let's break this down:
- `docker build` - Build an image from a Dockerfile
- `-t hello-api` - Tag (name) the image "hello-api"
- `.` - Build context is current directory (where to find Dockerfile and files)

Watch the build output - you'll see each layer being created!

### View Your Image

```bash
docker images | grep hello
```

---

## Run Your Image

```bash
docker run -d -p 8080:5000 --name hello hello-api
```

Now your .NET 9 API is running in a container!

### Test the Endpoints

```bash
# Main endpoint - shows hostname
curl http://localhost:8080

# Health check
curl http://localhost:8080/health

# System info
curl http://localhost:8080/info
```

Notice the `hostname` in the response - that's the container's ID!

---

## Multiple Containers, Same Image

Here's where it gets powerful. Run three containers from the same image:

```bash
docker run -d -p 8080:5000 --name hello hello-api
docker run -d -p 8081:5000 --name hello2 hello-api
docker run -d -p 8082:5000 --name hello3 hello-api
```

Now test each one:

```bash
curl http://localhost:8080 | jq .hostname
curl http://localhost:8081 | jq .hostname
curl http://localhost:8082 | jq .hostname
```

**Different hostnames!** Each container is its own isolated instance.

This is horizontal scaling - instead of making one server bigger, you run more copies.

---

## Hands-On Exercise

```bash
# 1. Navigate to the project
cd step-2-build-your-first-image/hello-api

# 2. Build the image (watch the layers!)
docker build -t hello-api .

# 3. Check the image exists
docker images | grep hello

# 4. Run a container
docker run -d -p 8080:5000 --name hello hello-api

# 5. Test it
curl http://localhost:8080 | jq

# 6. Run a second container on different port
docker run -d -p 8081:5000 --name hello2 hello-api

# 7. Compare hostnames
curl http://localhost:8080 | jq .hostname
curl http://localhost:8081 | jq .hostname

# 8. View running containers
docker ps

# 9. Clean up
docker rm -f hello hello2
```

---

## Quiz

Think about these questions:

- Why do we copy `*.csproj` before copying the rest of the code?
- What's the difference between `RUN` and `ENTRYPOINT`?
- Why use multi-stage builds instead of just one stage?
- If you change one line of code, which layers need to rebuild?

---

## The Problem Ahead

You can now build and run your own images. But think about this scenario:

**You need to run 4 services that talk to each other:**
- Users Service
- Orders Service
- Inventory Service
- API Gateway

With what you know now, you'd need:
- 4 separate `docker build` commands
- 4 separate `docker run` commands
- Figure out how services find each other (IP addresses? Container names?)
- Remember all the port mappings
- Restart them in the right order when something fails

Sounds painful? It is. Let's feel that pain in Step 3, then solve it properly in Step 4.

---

## Cleanup

```bash
docker rm -f hello hello2 hello3 2>/dev/null
docker rmi hello-api
```

---

## What We Learned

| Concept | What It Means |
|---------|---------------|
| Image | Read-only blueprint for containers |
| Container | Running instance of an image |
| Dockerfile | Recipe for building an image |
| Multi-stage build | Use big image to build, small image to run |
| `docker build` | Create an image from Dockerfile |
| `-t name` | Tag (name) your image |
| Layers | Each instruction creates a cached layer |
| Horizontal scaling | Run more copies instead of bigger servers |

---

**Next:** [Step 3 - Manual Networking](../step-3-manual-networking/)
