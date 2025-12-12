using Npgsql;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration["DATABASE_URL"]
    ?? "Host=postgres;Database=microservices;Username=postgres;Password=postgres";

builder.Services.AddScoped<NpgsqlConnection>(_ => new NpgsqlConnection(connectionString));

var app = builder.Build();

app.MapGet("/health", async (NpgsqlConnection db) =>
{
    try
    {
        await db.OpenAsync();
        await db.ExecuteScalarAsync("SELECT 1");
        return Results.Ok(new { service = "inventory", status = "healthy", database = "connected" });
    }
    catch (Exception ex)
    {
        return Results.Json(new { service = "inventory", status = "unhealthy", database = "disconnected", error = ex.Message }, statusCode: 503);
    }
});

app.MapGet("/inventory", async (NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var items = await db.QueryAsync<InventoryItem>(
        "SELECT id, name, quantity, price FROM inventory ORDER BY name");
    return new { service = "inventory-service", items = items.ToList(), count = items.Count() };
});

app.MapGet("/inventory/{itemId}", async (string itemId, NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var item = await db.QueryFirstOrDefaultAsync<InventoryItem>(
        "SELECT id, name, quantity, price FROM inventory WHERE id = @Id",
        new { Id = itemId });

    return item is not null
        ? Results.Ok(item)
        : Results.NotFound(new { error = "Item not found" });
});

app.MapPost("/inventory", async (CreateItemRequest request, NpgsqlConnection db) =>
{
    if (string.IsNullOrEmpty(request.Id) || string.IsNullOrEmpty(request.Name))
    {
        return Results.BadRequest(new { error = "id and name are required" });
    }

    await db.OpenAsync();

    // Check if item already exists
    var exists = await db.ExecuteScalarAsync<int>(
        "SELECT COUNT(*) FROM inventory WHERE id = @Id", new { Id = request.Id });

    if (exists > 0)
    {
        return Results.BadRequest(new { error = "Item ID already exists" });
    }

    await db.ExecuteAsync(
        "INSERT INTO inventory (id, name, quantity, price) VALUES (@Id, @Name, @Quantity, @Price)",
        new { request.Id, request.Name, Quantity = request.Quantity ?? 0, Price = request.Price ?? 0m });

    var item = new InventoryItem
    {
        Id = request.Id,
        Name = request.Name,
        Quantity = request.Quantity ?? 0,
        Price = request.Price ?? 0m
    };

    return Results.Created($"/inventory/{request.Id}", item);
});

app.MapPut("/inventory/{itemId}", async (string itemId, UpdateItemRequest request, NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var item = await db.QueryFirstOrDefaultAsync<InventoryItem>(
        "SELECT id, name, quantity, price FROM inventory WHERE id = @Id",
        new { Id = itemId });

    if (item is null) return Results.NotFound(new { error = "Item not found" });

    var newQuantity = request.Quantity ?? item.Quantity;
    var newPrice = request.Price ?? item.Price;

    await db.ExecuteAsync(
        "UPDATE inventory SET quantity = @Quantity, price = @Price, updated_at = CURRENT_TIMESTAMP WHERE id = @Id",
        new { Id = itemId, Quantity = newQuantity, Price = newPrice });

    return Results.Ok(new InventoryItem { Id = item.Id, Name = item.Name, Quantity = newQuantity, Price = newPrice });
});

app.MapPost("/inventory/{itemId}/reserve", async (string itemId, ReserveRequest request, NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var item = await db.QueryFirstOrDefaultAsync<InventoryItem>(
        "SELECT id, name, quantity, price FROM inventory WHERE id = @Id",
        new { Id = itemId });

    if (item is null) return Results.NotFound(new { error = "Item not found" });

    var quantity = request.Quantity ?? 1;
    if (item.Quantity < quantity)
    {
        return Results.BadRequest(new { error = "Insufficient stock", available = item.Quantity });
    }

    await db.ExecuteAsync(
        "UPDATE inventory SET quantity = quantity - @Qty, updated_at = CURRENT_TIMESTAMP WHERE id = @Id",
        new { Id = itemId, Qty = quantity });

    return Results.Ok(new
    {
        message = $"Reserved {quantity} units of {item.Name}",
        remaining = item.Quantity - quantity
    });
});

app.MapPost("/inventory/{itemId}/restock", async (string itemId, RestockRequest request, NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var item = await db.QueryFirstOrDefaultAsync<InventoryItem>(
        "SELECT id, name, quantity, price FROM inventory WHERE id = @Id",
        new { Id = itemId });

    if (item is null) return Results.NotFound(new { error = "Item not found" });

    var quantity = request.Quantity ?? 10;

    await db.ExecuteAsync(
        "UPDATE inventory SET quantity = quantity + @Qty, updated_at = CURRENT_TIMESTAMP WHERE id = @Id",
        new { Id = itemId, Qty = quantity });

    return Results.Ok(new
    {
        message = $"Restocked {quantity} units of {item.Name}",
        newQuantity = item.Quantity + quantity
    });
});

app.MapDelete("/inventory/{itemId}", async (string itemId, NpgsqlConnection db) =>
{
    await db.OpenAsync();

    // Check if item is in any orders
    var inOrders = await db.ExecuteScalarAsync<int>(
        "SELECT COUNT(*) FROM order_items WHERE item_id = @Id", new { Id = itemId });

    if (inOrders > 0)
    {
        return Results.BadRequest(new { error = "Cannot delete item that appears in orders" });
    }

    var deleted = await db.ExecuteAsync("DELETE FROM inventory WHERE id = @Id", new { Id = itemId });
    return deleted > 0
        ? Results.Ok(new { message = "Item deleted" })
        : Results.NotFound(new { error = "Item not found" });
});

app.Run();

public record InventoryItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public int Quantity { get; init; }
    public decimal Price { get; init; }
}

public record CreateItemRequest(string? Id, string? Name, int? Quantity, decimal? Price);
public record UpdateItemRequest(int? Quantity, decimal? Price);
public record ReserveRequest(int? Quantity);
public record RestockRequest(int? Quantity);
