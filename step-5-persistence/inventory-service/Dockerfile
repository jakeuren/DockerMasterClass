# Multi-stage build for .NET 9
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:5003
EXPOSE 5003

ENTRYPOINT ["dotnet", "InventoryService.dll"]
