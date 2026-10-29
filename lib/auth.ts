import { getUser } from "@netlify/identity";

// Only Identity users with the "admin" role may manage bookings, services and the gallery.
export async function requireAdmin(): Promise<Response | null> {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  if (!user.roles?.includes("admin")) {
    return Response.json({ error: "Your account does not have admin access." }, { status: 403 });
  }
  return null;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function isImage(file: unknown): file is File {
  return file instanceof File && file.size > 0 && file.type.startsWith("image/");
}

export function imageKey(prefix: string, file: File) {
  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
  return `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}
