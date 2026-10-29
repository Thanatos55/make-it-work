import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bookings } from "../../db/schema.js";
import { requireAdmin, isImage, imageKey, MAX_IMAGE_BYTES } from "../../lib/auth.js";

const STATUSES = ["new", "confirmed", "completed", "cancelled"];
const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export default async (req: Request, context: Context) => {
  const id = Number(context.params.id);

  if (req.method === "POST" && !context.params.id) {
    const form = await req.formData();
    // Hidden honeypot field: real visitors never fill it in
    if (field(form, "company")) return Response.json({ ok: true }, { status: 201 });

    const values = {
      fullName: field(form, "full-name"),
      email: field(form, "email") || null,
      telephone: field(form, "telephone"),
      postcode: field(form, "postcode"),
      preferredDate: field(form, "preferred-date"),
      preferredTime: field(form, "preferred-time"),
      service: field(form, "service-required"),
      description: field(form, "job-description"),
    };
    const missing = Object.entries(values).filter(([k, v]) => k !== "email" && !v);
    if (missing.length) return Response.json({ error: "Please fill in all required fields." }, { status: 400 });

    const photos = form.getAll("photo").filter(isImage).slice(0, 6);
    if (photos.some((p) => p.size > MAX_IMAGE_BYTES)) {
      return Response.json({ error: "Each photo must be under 5 MB." }, { status: 400 });
    }

    const store = getStore("booking-photos");
    const photoKeys: string[] = [];
    for (const photo of photos) {
      const key = imageKey("booking", photo);
      await store.set(key, await photo.arrayBuffer(), { metadata: { contentType: photo.type } });
      photoKeys.push(key);
    }

    const [booking] = await db.insert(bookings).values({ ...values, photoKeys }).returning({ id: bookings.id });
    return Response.json({ ok: true, id: booking.id }, { status: 201 });
  }

  const denied = await requireAdmin();
  if (denied) return denied;

  if (req.method === "GET") {
    return Response.json(await db.select().from(bookings).orderBy(desc(bookings.createdAt)));
  }

  if (req.method === "PATCH" && id) {
    const { status } = await req.json();
    if (!STATUSES.includes(status)) return Response.json({ error: "Invalid status." }, { status: 400 });
    const [updated] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return updated ? Response.json(updated) : Response.json({ error: "Not found." }, { status: 404 });
  }

  if (req.method === "DELETE" && id) {
    const [removed] = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    if (!removed) return Response.json({ error: "Not found." }, { status: 404 });
    const store = getStore("booking-photos");
    await Promise.all(removed.photoKeys.map((key) => store.delete(key)));
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/bookings", "/api/bookings/:id"],
};
