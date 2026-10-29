import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { galleryItems } from "../../db/schema.js";
import { requireAdmin, isImage, imageKey, MAX_IMAGE_BYTES } from "../../lib/auth.js";

export default async (req: Request, context: Context) => {
  const id = Number(context.params.id);

  if (req.method === "GET") {
    return Response.json(
      await db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt)),
    );
  }

  const denied = await requireAdmin();
  if (denied) return denied;

  if (req.method === "POST") {
    const form = await req.formData();
    const image = form.get("image");
    if (!isImage(image)) return Response.json({ error: "Please choose an image." }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: "Image must be under 5 MB." }, { status: 400 });

    const key = imageKey("gallery", image);
    await getStore("gallery").set(key, await image.arrayBuffer(), { metadata: { contentType: image.type } });

    const [created] = await db
      .insert(galleryItems)
      .values({
        title: String(form.get("title") ?? "").trim() || "Project photo",
        caption: String(form.get("caption") ?? "").trim(),
        sortOrder: Math.round(Number(form.get("sortOrder")) || 0),
        imageKey: key,
      })
      .returning();
    return Response.json(created, { status: 201 });
  }

  if (req.method === "PUT" && id) {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
    const [updated] = await db
      .update(galleryItems)
      .set({ title, caption: String(body.caption ?? "").trim(), sortOrder: Math.round(Number(body.sortOrder) || 0) })
      .where(eq(galleryItems.id, id))
      .returning();
    return updated ? Response.json(updated) : Response.json({ error: "Not found." }, { status: 404 });
  }

  if (req.method === "DELETE" && id) {
    const [removed] = await db.delete(galleryItems).where(eq(galleryItems.id, id)).returning();
    if (removed) await getStore("gallery").delete(removed.imageKey);
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/gallery", "/api/gallery/:id"],
};
