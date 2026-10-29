import type { Config, Context } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { services } from "../../db/schema.js";
import { requireAdmin } from "../../lib/auth.js";

const slugify = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "service";

function parse(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  if (!name || !description) return null;
  return {
    name,
    description,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.round(Number(body.sortOrder)) : 0,
    visible: body.visible !== false,
  };
}

export default async (req: Request, context: Context) => {
  const id = Number(context.params.id);
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("all") !== "1") {
    const rows = await db.select().from(services).where(eq(services.visible, true)).orderBy(asc(services.sortOrder), asc(services.id));
    return Response.json(rows);
  }

  const denied = await requireAdmin();
  if (denied) return denied;

  if (req.method === "GET") {
    return Response.json(await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id)));
  }

  if (req.method === "POST") {
    const values = parse(await req.json());
    if (!values) return Response.json({ error: "Name and description are required." }, { status: 400 });
    const [created] = await db
      .insert(services)
      .values({ ...values, slug: `${slugify(values.name)}-${Date.now().toString(36)}` })
      .returning();
    return Response.json(created, { status: 201 });
  }

  if (req.method === "PUT" && id) {
    const values = parse(await req.json());
    if (!values) return Response.json({ error: "Name and description are required." }, { status: 400 });
    const [updated] = await db.update(services).set(values).where(eq(services.id, id)).returning();
    return updated ? Response.json(updated) : Response.json({ error: "Not found." }, { status: 404 });
  }

  if (req.method === "DELETE" && id) {
    await db.delete(services).where(eq(services.id, id));
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/services", "/api/services/:id"],
};
