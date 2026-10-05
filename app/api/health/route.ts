export function GET() {
  return Response.json({
    status: "ok",
    platform: "cloudflare-workers",
    database: "d1",
    objectStorage: "r2",
    authentication: "cloudflare-access",
    timestamp: new Date().toISOString(),
  });
}
