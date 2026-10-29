import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../../lib/auth.js";

// Gallery photos are public; photos attached to bookings are only visible to admins.
export default async (req: Request, context: Context) => {
  const { kind, key } = context.params;
  const storeName = kind === "gallery" ? "gallery" : kind === "booking" ? "booking-photos" : null;
  if (!storeName || !key) return new Response("Not found", { status: 404 });

  if (storeName === "booking-photos") {
    const denied = await requireAdmin();
    if (denied) return denied;
  }

  const entry = await getStore(storeName).getWithMetadata(`${kind}/${key}`, { type: "arrayBuffer" });
  if (!entry) return new Response("Not found", { status: 404 });

  return new Response(entry.data, {
    headers: {
      "Content-Type": String(entry.metadata.contentType || "image/jpeg"),
      "Cache-Control": storeName === "gallery" ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
};

export const config: Config = {
  path: "/api/images/:kind/:key",
  method: "GET",
};
