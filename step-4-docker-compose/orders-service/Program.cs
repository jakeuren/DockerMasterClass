using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddSingleton<OrderStore>();
builder.Services.AddSingleton<ServiceClient>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
});

var app = builder.Build();

app.MapGet("/health", () => new { service = "orders", status = "healthy" });

app.MapGet("/orders", (OrderStore store) => new
{
    service = "orders-service",
    orders = store.GetAll(),
    count = store.GetAll().Count
});

app.MapGet("/orders/{orderId}", async (string orderId, OrderStore store, ServiceClient client) =>
{
    var order = store.Get(orderId);
    if (order is null)
    {
        return Results.NotFound(new { error = "Order not found" });
    }

    // Enrich with user data
    var userResult = await client.GetUserAsync(order.UserId);
    return Results.Ok(new
    {
        order.Id,
        order.UserId,
        order.Items,
        order.Status,
        order.CreatedAt,
        user = userResult ?? new { error = "Could not fetch user data" }
    });
});

app.MapPost("/orders", async (CreateOrderRequest request, OrderStore store, ServiceClient client) =>
{
    if (string.IsNullOrEmpty(request.UserId) || request.Items is null || request.Items.Count == 0)
    {
        return Results.BadRequest(new { error = "user_id and items are required" });
    }

    // Verify user exists
    var userExists = await client.UserExistsAsync(request.UserId);
    if (!userExists.HasValue)
    {
        return Results.Json(new { error = "Users service unavailable" }, statusCode: 503);
    }
    if (!userExists.Value)
    {
        return Results.BadRequest(new { error = "User not found" });
    }

    // Check inventory
    foreach (var item in request.Items)
    {
        var stockCheck = await client.CheckStockAsync(item.ItemId, item.Quantity);
        if (stockCheck is null)
        {
            return Results.Json(new { error = "Inventory service unavailable" }, statusCode: 503);
        }
        if (!stockCheck.Value)
        {
            return Results.BadRequest(new { error = $"Insufficient stock for {item.ItemId}" });
        }
    }

    var order = store.Create(request.UserId, request.Items);
    return Results.Created($"/orders/{order.Id}", order);
});

app.Run();

// Models
public record Order
{
    public required string Id { get; init; }
    public required string UserId { get; init; }
    public required List<OrderItem> Items { get; init; }
    public required string Status { get; init; }
    public required string CreatedAt { get; init; }
}

public record OrderItem
{
    public required string ItemId { get; init; }
    public int Quantity { get; init; } = 1;
}

public record CreateOrderRequest(string? UserId, List<OrderItem>? Items);

// In-memory store
public class OrderStore
{
    private readonly Dictionary<string, Order> _orders = new()
    {
        ["ORD001"] = new Order
        {
            Id = "ORD001",
            UserId = "1",
            Items = [new OrderItem { ItemId = "ITEM001", Quantity = 2 }],
            Status = "completed",
            CreatedAt = "2025-01-15T10:30:00Z"
        }
    };

    public List<Order> GetAll() => _orders.Values.ToList();
    public Order? Get(string id) => _orders.GetValueOrDefault(id);

    public Order Create(string userId, List<OrderItem> items)
    {
        var id = $"ORD{Guid.NewGuid().ToString()[..6].ToUpper()}";
        var order = new Order
        {
            Id = id,
            UserId = userId,
            Items = items,
            Status = "pending",
            CreatedAt = DateTime.UtcNow.ToString("O")
        };
        _orders[id] = order;
        return order;
    }
}

// Service client for inter-service communication
public class ServiceClient
{
    private readonly HttpClient _http;
    private readonly string _usersUrl;
    private readonly string _inventoryUrl;

    public ServiceClient(IHttpClientFactory factory, IConfiguration config)
    {
        _http = factory.CreateClient();
        _http.Timeout = TimeSpan.FromSeconds(5);
        _usersUrl = config["USERS_SERVICE_URL"] ?? "http://users-service:5001";
        _inventoryUrl = config["INVENTORY_SERVICE_URL"] ?? "http://inventory-service:5003";
    }

    public async Task<bool?> UserExistsAsync(string userId)
    {
        try
        {
            var response = await _http.GetAsync($"{_usersUrl}/users/{userId}");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return null;
        }
    }

    public async Task<object?> GetUserAsync(string userId)
    {
        try
        {
            var response = await _http.GetAsync($"{_usersUrl}/users/{userId}");
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<object>();
            }
            return null;
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool?> CheckStockAsync(string itemId, int quantity)
    {
        try
        {
            var response = await _http.GetAsync($"{_inventoryUrl}/inventory/{itemId}");
            if (!response.IsSuccessStatusCode) return false;

            var item = await response.Content.ReadFromJsonAsync<InventoryItemResponse>();
            return item?.Quantity >= quantity;
        }
        catch
        {
            return null;
        }
    }

    private record InventoryItemResponse(string Id, string Name, int Quantity, decimal Price);
}

