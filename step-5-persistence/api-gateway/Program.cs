var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddSingleton<GatewayService>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();

app.MapGet("/", () => new
{
    service = "API Gateway",
    version = "2.0",
    endpoints = new[] { "/users", "/orders", "/inventory", "/health" },
    message = "Welcome to the Microservices Demo with PostgreSQL Persistence!",
    features = new[] { "Data persistence", "Volume mounting", "Database health checks" }
});

app.MapGet("/health", async (GatewayService gateway) =>
{
    var health = await gateway.GetHealthAsync();
    var allHealthy = health.Values.All(v => v == "healthy");
    return Results.Json(new
    {
        status = allHealthy ? "healthy" : "degraded",
        services = health
    }, statusCode: allHealthy ? 200 : 503);
});

// Users proxy
app.MapGet("/users", (GatewayService gateway) => gateway.ProxyGetAsync("users", "/users"));
app.MapGet("/users/{userId}", (string userId, GatewayService gateway) => gateway.ProxyGetAsync("users", $"/users/{userId}"));
app.MapPost("/users", (HttpRequest request, GatewayService gateway) => gateway.ProxyPostAsync("users", "/users", request));
app.MapDelete("/users/{userId}", (string userId, GatewayService gateway) => gateway.ProxyDeleteAsync("users", $"/users/{userId}"));

// Orders proxy
app.MapGet("/orders", (GatewayService gateway) => gateway.ProxyGetAsync("orders", "/orders"));
app.MapGet("/orders/{orderId}", (string orderId, GatewayService gateway) => gateway.ProxyGetAsync("orders", $"/orders/{orderId}"));
app.MapPost("/orders", (HttpRequest request, GatewayService gateway) => gateway.ProxyPostAsync("orders", "/orders", request));
app.MapPut("/orders/{orderId}/status", (string orderId, HttpRequest request, GatewayService gateway) => gateway.ProxyPutAsync("orders", $"/orders/{orderId}/status", request));
app.MapDelete("/orders/{orderId}", (string orderId, GatewayService gateway) => gateway.ProxyDeleteAsync("orders", $"/orders/{orderId}"));

// Inventory proxy
app.MapGet("/inventory", (GatewayService gateway) => gateway.ProxyGetAsync("inventory", "/inventory"));
app.MapGet("/inventory/{itemId}", (string itemId, GatewayService gateway) => gateway.ProxyGetAsync("inventory", $"/inventory/{itemId}"));
app.MapPost("/inventory", (HttpRequest request, GatewayService gateway) => gateway.ProxyPostAsync("inventory", "/inventory", request));
app.MapPut("/inventory/{itemId}", (string itemId, HttpRequest request, GatewayService gateway) => gateway.ProxyPutAsync("inventory", $"/inventory/{itemId}", request));
app.MapPost("/inventory/{itemId}/reserve", (string itemId, HttpRequest request, GatewayService gateway) => gateway.ProxyPostAsync("inventory", $"/inventory/{itemId}/reserve", request));
app.MapPost("/inventory/{itemId}/restock", (string itemId, HttpRequest request, GatewayService gateway) => gateway.ProxyPostAsync("inventory", $"/inventory/{itemId}/restock", request));
app.MapDelete("/inventory/{itemId}", (string itemId, GatewayService gateway) => gateway.ProxyDeleteAsync("inventory", $"/inventory/{itemId}"));

app.Run();

public class GatewayService
{
    private readonly HttpClient _http;
    private readonly Dictionary<string, string> _services;

    public GatewayService(IHttpClientFactory factory, IConfiguration config)
    {
        _http = factory.CreateClient();
        _http.Timeout = TimeSpan.FromSeconds(5);
        _services = new Dictionary<string, string>
        {
            ["users"] = config["USERS_SERVICE_URL"] ?? "http://users-service:5001",
            ["orders"] = config["ORDERS_SERVICE_URL"] ?? "http://orders-service:5002",
            ["inventory"] = config["INVENTORY_SERVICE_URL"] ?? "http://inventory-service:5003"
        };
    }

    public async Task<Dictionary<string, string>> GetHealthAsync()
    {
        var health = new Dictionary<string, string> { ["gateway"] = "healthy" };

        foreach (var (name, url) in _services)
        {
            try
            {
                var response = await _http.GetAsync($"{url}/health");
                if (response.IsSuccessStatusCode)
                {
                    var data = await response.Content.ReadFromJsonAsync<HealthResponse>();
                    health[name] = data?.Database == "connected" ? "healthy" : "degraded";
                }
                else
                {
                    health[name] = "unhealthy";
                }
            }
            catch
            {
                health[name] = "unreachable";
            }
        }

        return health;
    }

    public async Task<IResult> ProxyGetAsync(string service, string path)
    {
        try
        {
            var response = await _http.GetAsync($"{_services[service]}{path}");
            var content = await response.Content.ReadFromJsonAsync<object>();
            return Results.Json(content, statusCode: (int)response.StatusCode);
        }
        catch (HttpRequestException)
        {
            return Results.Json(new { error = "Service unavailable" }, statusCode: 503);
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = ex.Message }, statusCode: 500);
        }
    }

    public async Task<IResult> ProxyPostAsync(string service, string path, HttpRequest request)
    {
        try
        {
            var body = await request.ReadFromJsonAsync<object>();
            var response = await _http.PostAsJsonAsync($"{_services[service]}{path}", body);
            var content = await response.Content.ReadFromJsonAsync<object>();
            return Results.Json(content, statusCode: (int)response.StatusCode);
        }
        catch (HttpRequestException)
        {
            return Results.Json(new { error = "Service unavailable" }, statusCode: 503);
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = ex.Message }, statusCode: 500);
        }
    }

    public async Task<IResult> ProxyPutAsync(string service, string path, HttpRequest request)
    {
        try
        {
            var body = await request.ReadFromJsonAsync<object>();
            var response = await _http.PutAsJsonAsync($"{_services[service]}{path}", body);
            var content = await response.Content.ReadFromJsonAsync<object>();
            return Results.Json(content, statusCode: (int)response.StatusCode);
        }
        catch (HttpRequestException)
        {
            return Results.Json(new { error = "Service unavailable" }, statusCode: 503);
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = ex.Message }, statusCode: 500);
        }
    }

    public async Task<IResult> ProxyDeleteAsync(string service, string path)
    {
        try
        {
            var response = await _http.DeleteAsync($"{_services[service]}{path}");
            var content = await response.Content.ReadFromJsonAsync<object>();
            return Results.Json(content, statusCode: (int)response.StatusCode);
        }
        catch (HttpRequestException)
        {
            return Results.Json(new { error = "Service unavailable" }, statusCode: 503);
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = ex.Message }, statusCode: 500);
        }
    }

    private record HealthResponse(string Service, string Status, string? Database);
}
