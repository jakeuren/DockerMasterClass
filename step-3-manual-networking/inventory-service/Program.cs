var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<InventoryStore>();

var app = builder.Build();

app.MapGet("/health", () => new { service = "inventory", status = "healthy" });

app.MapGet("/inventory", (InventoryStore store) => new
{
    service = "inventory-service",
    items = store.GetAll(),
    count = store.GetAll().Count
});

app.MapGet("/inventory/{itemId}", (string itemId, InventoryStore store) =>
{
    var item = store.Get(itemId);
    return item is not null
        ? Results.Ok(item)
        : Results.NotFound(new { error = "Item not found" });
});

app.MapPut("/inventory/{itemId}", (string itemId, UpdateItemRequest request, InventoryStore store) =>
{
    var item = store.Get(itemId);
    if (item is null) return Results.NotFound(new { error = "Item not found" });

    if (request.Quantity.HasValue) item.Quantity = request.Quantity.Value;
    if (request.Price.HasValue) item.Price = request.Price.Value;

    return Results.Ok(item);
});

app.MapPost("/inventory/{itemId}/reserve", (string itemId, ReserveRequest request, InventoryStore store) =>
{
    var item = store.Get(itemId);
    if (item is null) return Results.NotFound(new { error = "Item not found" });

    var quantity = request.Quantity ?? 1;
    if (item.Quantity < quantity)
    {
        return Results.BadRequest(new { error = "Insufficient stock", available = item.Quantity });
    }

    item.Quantity -= quantity;
    return Results.Ok(new
    {
        message = $"Reserved {quantity} units of {item.Name}",
        remaining = item.Quantity
    });
});

app.Run();

// Models
public record InventoryItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public record UpdateItemRequest(int? Quantity, decimal? Price);
public record ReserveRequest(int? Quantity);

// In-memory store
public class InventoryStore
{
    private readonly Dictionary<string, InventoryItem> _items = new()
    {
        ["ITEM001"] = new InventoryItem { Id = "ITEM001", Name = "Docker Handbook", Quantity = 50, Price = 29.99m },
        ["ITEM002"] = new InventoryItem { Id = "ITEM002", Name = "Container Stickers", Quantity = 200, Price = 4.99m },
        ["ITEM003"] = new InventoryItem { Id = "ITEM003", Name = "Kubernetes Mug", Quantity = 25, Price = 14.99m },
        ["ITEM004"] = new InventoryItem { Id = "ITEM004", Name = "DevOps T-Shirt", Quantity = 75, Price = 24.99m },
    };

    public List<InventoryItem> GetAll() => _items.Values.ToList();
    public InventoryItem? Get(string id) => _items.GetValueOrDefault(id);
}
