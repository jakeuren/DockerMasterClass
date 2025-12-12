var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var hostname = Environment.MachineName;
var startTime = DateTime.UtcNow;

app.MapGet("/", () => new
{
    message = "Hello from .NET 9 in Docker!",
    hostname,
    timestamp = DateTime.UtcNow.ToString("O")
});

app.MapGet("/health", () => new
{
    status = "healthy",
    uptime = (DateTime.UtcNow - startTime).ToString(@"hh\:mm\:ss"),
    hostname
});

app.MapGet("/info", () => new
{
    runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    os = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
    hostname,
    processId = Environment.ProcessId
});

Console.WriteLine($"🚀 Hello API running on {hostname}");
app.Run();
