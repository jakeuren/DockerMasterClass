var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<UserStore>();

var app = builder.Build();

app.MapGet("/health", () => new { service = "users", status = "healthy" });

app.MapGet("/users", (UserStore store) => new
{
    service = "users-service",
    users = store.GetAll(),
    count = store.GetAll().Count
});

app.MapGet("/users/{userId}", (string userId, UserStore store) =>
{
    var user = store.Get(userId);
    return user is not null
        ? Results.Ok(user)
        : Results.NotFound(new { error = "User not found" });
});

app.MapPost("/users", (CreateUserRequest request, UserStore store) =>
{
    if (string.IsNullOrEmpty(request.Name))
    {
        return Results.BadRequest(new { error = "Name is required" });
    }

    var user = store.Create(request.Name, request.Email);
    return Results.Created($"/users/{user.Id}", user);
});

app.Run();

// Models
public record User
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
}

public record CreateUserRequest(string? Name, string? Email);

// In-memory store
public class UserStore
{
    private readonly Dictionary<string, User> _users = new()
    {
        ["1"] = new User { Id = "1", Name = "Alice", Email = "alice@example.com" },
        ["2"] = new User { Id = "2", Name = "Bob", Email = "bob@example.com" },
        ["3"] = new User { Id = "3", Name = "Charlie", Email = "charlie@example.com" },
    };

    public List<User> GetAll() => _users.Values.ToList();
    public User? Get(string id) => _users.GetValueOrDefault(id);

    public User Create(string name, string? email)
    {
        var id = Guid.NewGuid().ToString()[..8];
        var user = new User
        {
            Id = id,
            Name = name,
            Email = email ?? $"{name.ToLower()}@example.com"
        };
        _users[id] = user;
        return user;
    }
}
