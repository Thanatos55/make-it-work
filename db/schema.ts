import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const bookings = pgTable("bookings", {
  id: serial().primaryKey(),
  fullName: text("full_name").notNull(),
  email: text(),
  telephone: text().notNull(),
  postcode: text().notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  service: text().notNull(),
  description: text().notNull(),
  photoKeys: jsonb("photo_keys").$type<string[]>().notNull().default([]),
  status: text().notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean().notNull().default(true),
});

export const galleryItems = pgTable("gallery_items", {
  id: serial().primaryKey(),
  title: text().notNull(),
  caption: text().notNull().default(""),
  imageKey: text("image_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
