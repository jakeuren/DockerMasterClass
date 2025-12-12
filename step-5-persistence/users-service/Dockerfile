# Multi-stage build for .NET 9
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project file and restore dependencies (layer caching)
COPY *.csproj ./
RUN dotnet restore

# Copy source and publish
COPY . ./
RUN dotnet publish -c Release -o /app

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:5001
EXPOSE 5001

ENTRYPOINT ["dotnet", "UsersService.dll"]
