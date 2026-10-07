import { env } from "cloudflare:workers";
import { getAppUser } from "@/app/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Dữ liệu tải lên không hợp lệ" }, { status: 400 });
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Thiếu tệp hóa đơn" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Chỉ hỗ trợ JPG, PNG, WebP hoặc PDF" }, { status: 415 });
  if (file.size > MAX_FILE_SIZE) return Response.json({ error: "Tệp không được vượt quá 5 MB" }, { status: 413 });

  const key = `${user.userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  await env.RECEIPTS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { owner: user.userId, originalName: file.name },
  });

  return Response.json({ key, url: `/api/receipts?key=${encodeURIComponent(key)}` }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !ownsKey(user.userId, key)) return Response.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });

  const object = await env.RECEIPTS.get(key);
  if (!object) return Response.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=3600");
  return new Response(object.body, { headers });
}

export async function DELETE(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !ownsKey(user.userId, key)) return Response.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });

  await env.RECEIPTS.delete(key);
  return Response.json({ ok: true });
}

function ownsKey(userId: string, key: string) {
  return key.startsWith(`${userId}/`) && !key.includes("..") && !key.includes("\\");
}

function safeFileName(value: string) {
  const normalized = value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 96) || "receipt";
}
