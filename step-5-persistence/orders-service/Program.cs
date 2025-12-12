using System.Text.Json;
using System.Text.Json.Serialization;
using Npgsql;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration["DATABASE_URL"]
    ?? "Host=postgres;Database=microservices;Username=postgres;Password=postgres";

builder.Services.AddScoped<NpgsqlConnection>(_ => new NpgsqlConnection(connectionString));
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ServiceClient>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
});

var app = builder.Build();

app.MapGet("/health", async (NpgsqlConnection db) =>
{
    try
    {
        await db.OpenAsync();
        await db.ExecuteScalarAsync("SELECT 1");
        return Results.Ok(new { service = "orders", status = "healthy", database = "connected" });
    }
    catch (Exception ex)
    {
        return Results.Json(new { service = "orders", status = "unhealthy", database = "disconnected", error = ex.Message }, statusCode: 503);
    }
});

app.MapGet("/orders", async (NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var orders = await db.QueryAsync<OrderRow>(
        "SELECT id, user_id, status, created_at FROM orders ORDER BY created_at DESC");

    var result = new List<object>();
    foreach (var order in orders)
    {
        var items = await db.QueryAsync<OrderItemRow>(
            "SELECT item_id, quantity FROM order_items WHERE order_id = @OrderId",
            new { OrderId = order.Id });

        result.Add(new
        {
            order.Id,
            UserId = order.User_Id,
            order.Status,
            CreatedAt = order.Created_At,
            Items = items.Select(i => new { ItemId = i.Item_Id, i.Quantity }).ToList()
        });
    }

    return new { service = "orders-service", orders = result, count = result.Count };
});

app.MapGet("/orders/{orderId}", async (string orderId, NpgsqlConnection db, ServiceClient client) =>
{
    await db.OpenAsync();
    var order = await db.QueryFirstOrDefaultAsync<OrderRow>(
        "SELECT id, user_id, status, created_at FROM orders WHERE id = @Id",
        new { Id = orderId });

    if (order is null)
    {
        return Results.NotFound(new { error = "Order not found" });
    }

    var items = await db.QueryAsync<OrderItemRow>(
        "SELECT item_id, quantity FROM order_items WHERE order_id = @OrderId",
        new { OrderId = orderId });

    var userResult = await client.GetUserAsync(order.User_Id);

    return Results.Ok(new
    {
        order.Id,
        UserId = order.User_Id,
        Items = items.Select(i => new { ItemId = i.Item_Id, i.Quantity }).ToList(),
        order.Status,
        CreatedAt = order.Created_At,
        User = userResult ?? new { error = "Could not fetch user data" }
    });
});

app.MapPost("/orders", async (CreateOrderRequest request, NpgsqlConnection db, ServiceClient client) =>
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

    // Check and reserve inventory
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

    // Reserve inventory
    foreach (var item in request.Items)
    {
        await client.ReserveStockAsync(item.ItemId, item.Quantity);
    }

    // Create order in database
    await db.OpenAsync();
    var orderId = $"ORD{Guid.NewGuid().ToString()[..6].ToUpper()}";

    await db.ExecuteAsync(
        "INSERT INTO orders (id, user_id, status) VALUES (@Id, @UserId, 'pending')",
        new { Id = orderId, request.UserId });

    foreach (var item in request.Items)
    {
        await db.ExecuteAsync(
            "INSERT INTO order_items (order_id, item_id, quantity) VALUES (@OrderId, @ItemId, @Quantity)",
            new { OrderId = orderId, item.ItemId, item.Quantity });
    }

    return Results.Created($"/orders/{orderId}", new
    {
        Id = orderId,
        request.UserId,
        request.Items,
        Status = "pending",
        CreatedAt = DateTime.UtcNow.ToString("O")
    });
});

app.MapPut("/orders/{orderId}/status", async (string orderId, UpdateStatusRequest request, NpgsqlConnection db) =>
{
    if (string.IsNullOrEmpty(request.Status))
    {
        return Results.BadRequest(new { error = "status is required" });
    }

    var validStatuses = new[] { "pending", "processing", "completed", "cancelled" };
    if (!validStatuses.Contains(request.Status.ToLower()))
    {
        return Results.BadRequest(new { error = $"Invalid status. Valid values: {string.Join(", ", validStatuses)}" });
    }

    await db.OpenAsync();
    var updated = await db.ExecuteAsync(
        "UPDATE orders SET status = @Status WHERE id = @Id",
        new { Id = orderId, Status = request.Status.ToLower() });

    return updated > 0
        ? Results.Ok(new { message = "Order status updated", status = request.Status.ToLower() })
        : Results.NotFound(new { error = "Order not found" });
});

app.MapDelete("/orders/{orderId}", async (string orderId, NpgsqlConnection db) =>
{
    await db.OpenAsync();

    // Order items will be deleted by CASCADE
    var deleted = await db.ExecuteAsync("DELETE FROM orders WHERE id = @Id", new { Id = orderId });

    return deleted > 0
        ? Results.Ok(new { message = "Order deleted" })
        : Results.NotFound(new { error = "Order not found" });
});

app.Run();

// Database row types
public record OrderRow
{
    public required string Id { get; init; }
    public required string User_Id { get; init; }
    public required string Status { get; init; }
    public DateTime Created_At { get; init; }
}

public record OrderItemRow
{
    public required string Item_Id { get; init; }
    public int Quantity { get; init; }
}

// Request types
public record OrderItem
{
    [JsonPropertyName("item_id")]
    public required string ItemId { get; init; }
    public int Quantity { get; init; } = 1;
}

public record CreateOrderRequest(
    [property: JsonPropertyName("user_id")] string? UserId,
    List<OrderItem>? Items
);

public record UpdateStatusRequest(string? Status);

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
        catch { return null; }
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
        catch { return null; }
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
        catch { return null; }
    }

    public async Task<bool> ReserveStockAsync(string itemId, int quantity)
    {
        try
        {
            var response = await _http.PostAsJsonAsync(
                $"{_inventoryUrl}/inventory/{itemId}/reserve",
                new { quantity });
            return response.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    private record InventoryItemResponse(string Id, string Name, int Quantity, decimal Price);
}
