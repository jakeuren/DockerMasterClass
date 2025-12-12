# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy source code and publish
COPY . ./
RUN dotnet publish -c Release -o /app

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app ./

# Set the port
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

# Run the app
ENTRYPOINT ["dotnet", "HelloApi.dll"]
