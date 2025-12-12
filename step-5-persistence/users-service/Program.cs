using Npgsql;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

// Get connection string from environment
var connectionString = builder.Configuration["DATABASE_URL"]
    ?? "Host=postgres;Database=microservices;Username=postgres;Password=postgres";

builder.Services.AddScoped<NpgsqlConnection>(_ => new NpgsqlConnection(connectionString));

var app = builder.Build();

// Health check with DB connectivity test
app.MapGet("/health", async (NpgsqlConnection db) =>
{
    try
    {
        await db.OpenAsync();
        await db.ExecuteScalarAsync("SELECT 1");
        return Results.Ok(new { service = "users", status = "healthy", database = "connected" });
    }
    catch (Exception ex)
    {
        return Results.Json(new { service = "users", status = "unhealthy", database = "disconnected", error = ex.Message }, statusCode: 503);
    }
});

app.MapGet("/users", async (NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var users = await db.QueryAsync<User>("SELECT id, name, email, created_at as CreatedAt FROM users ORDER BY created_at");
    return new { service = "users-service", users = users.ToList(), count = users.Count() };
});

app.MapGet("/users/{userId}", async (string userId, NpgsqlConnection db) =>
{
    await db.OpenAsync();
    var user = await db.QueryFirstOrDefaultAsync<User>(
        "SELECT id, name, email, created_at as CreatedAt FROM users WHERE id = @Id",
        new { Id = userId });

    return user is not null
        ? Results.Ok(user)
        : Results.NotFound(new { error = "User not found" });
});

app.MapPost("/users", async (CreateUserRequest request, NpgsqlConnection db) =>
{
    if (string.IsNullOrEmpty(request.Name))
    {
        return Results.BadRequest(new { error = "Name is required" });
    }

    await db.OpenAsync();
    var id = Guid.NewGuid().ToString()[..8];
    var email = request.Email ?? $"{request.Name.ToLower().Replace(" ", ".")}@example.com";

    await db.ExecuteAsync(
        "INSERT INTO users (id, name, email) VALUES (@Id, @Name, @Email)",
        new { Id = id, Name = request.Name, Email = email });

    var user = new User { Id = id, Name = request.Name, Email = email };
    return Results.Created($"/users/{id}", user);
});

app.MapDelete("/users/{userId}", async (string userId, NpgsqlConnection db) =>
{
    await db.OpenAsync();

    // Check if user has orders
    var hasOrders = await db.ExecuteScalarAsync<int>(
        "SELECT COUNT(*) FROM orders WHERE user_id = @Id", new { Id = userId });

    if (hasOrders > 0)
    {
        return Results.BadRequest(new { error = "Cannot delete user with existing orders" });
    }

    var deleted = await db.ExecuteAsync("DELETE FROM users WHERE id = @Id", new { Id = userId });
    return deleted > 0
        ? Results.Ok(new { message = "User deleted" })
        : Results.NotFound(new { error = "User not found" });
});

app.Run();

public record User
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public DateTime? CreatedAt { get; init; }
}

public record CreateUserRequest(string? Name, string? Email);
