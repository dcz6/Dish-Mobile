import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
});

export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  datetime: timestamp("datetime").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  rawLlmOutput: jsonb("raw_llm_output"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const dishes = pgTable("dishes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  name: text("name").notNull(),
});

export const ratingEnum = z.enum(["Elite", "Would order again", "Should try once", "Not for me"]);
export type Rating = z.infer<typeof ratingEnum>;

export const dishInstances = pgTable("dish_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dishId: varchar("dish_id").notNull().references(() => dishes.id),
  receiptId: varchar("receipt_id").notNull().references(() => receipts.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  rating: text("rating"),
});

export const dishPhotos = pgTable("dish_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dishInstanceId: varchar("dish_instance_id").references(() => dishInstances.id),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true });
export const insertReceiptSchema = createInsertSchema(receipts).omit({ id: true, createdAt: true });
export const insertDishSchema = createInsertSchema(dishes).omit({ id: true });
export const insertDishInstanceSchema = createInsertSchema(dishInstances).omit({ id: true });
export const insertDishPhotoSchema = createInsertSchema(dishPhotos).omit({ id: true, createdAt: true });

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Dish = typeof dishes.$inferSelect;
export type InsertDish = z.infer<typeof insertDishSchema>;
export type DishInstance = typeof dishInstances.$inferSelect;
export type InsertDishInstance = z.infer<typeof insertDishInstanceSchema>;
export type DishPhoto = typeof dishPhotos.$inferSelect;
export type InsertDishPhoto = z.infer<typeof insertDishPhotoSchema>;

export interface ParsedReceipt {
  restaurantName: string;
  restaurantAddress?: string;
  datetime: string;
  total: number | null;
  lineItems: Array<{
    dishName: string;
    price: number | null;
  }>;
}

export interface ReceiptWithDetails extends Receipt {
  restaurant: Restaurant;
  dishInstances: Array<DishInstance & { dish: Dish; photo?: DishPhoto }>;
}

export interface DishPhotoWithDetails extends DishPhoto {
  dishInstance?: DishInstance & { dish: Dish; receipt: Receipt & { restaurant: Restaurant } };
}
