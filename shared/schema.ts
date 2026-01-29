import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, uniqueIndex, index, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Test user UUID for MVP - hardcoded single user
export const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

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
  description: text("description"),
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
  dishId: varchar("dish_id").notNull().references(() => dishes.id),
  postedByUserId: varchar("posted_by_user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  dishIdIdx: index("dish_photos_dish_id_idx").on(table.dishId),
}));

export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  userFollowsUnique: uniqueIndex("user_follows_follower_following_unique").on(table.followerId, table.followingId),
}));

export const photoLikes = pgTable("photo_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dishPhotoId: varchar("dish_photo_id").notNull().references(() => dishPhotos.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  photoLikesUnique: uniqueIndex("photo_likes_photo_user_unique").on(table.dishPhotoId, table.userId),
  userIdIdx: index("photo_likes_user_id_idx").on(table.userId),
}));

export const dishBookmarks = pgTable("dish_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dishId: varchar("dish_id").notNull().references(() => dishes.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  dishBookmarksUnique: uniqueIndex("dish_bookmarks_user_dish_unique").on(table.userId, table.dishId),
  userIdIdx: index("dish_bookmarks_user_id_idx").on(table.userId),
}));

export const restaurantBookmarks = pgTable("restaurant_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  restaurantBookmarksUnique: uniqueIndex("restaurant_bookmarks_user_restaurant_unique").on(table.userId, table.restaurantId),
  userIdIdx: index("restaurant_bookmarks_user_id_idx").on(table.userId),
}));

export const shareTypeEnum = z.enum(["dish", "dish_instance", "restaurant", "user_profile"]);
export type ShareType = z.infer<typeof shareTypeEnum>;

export const shares = pgTable("shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  shareType: text("share_type").notNull(), // enum: "dish", "dish_instance", "restaurant", "user_profile"
  dishId: varchar("dish_id").references(() => dishes.id),
  dishInstanceId: varchar("dish_instance_id").references(() => dishInstances.id),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id),
  sharedUserId: varchar("shared_user_id").references(() => users.id),
  message: text("message"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  recipientIdIdx: index("shares_recipient_id_idx").on(table.recipientId),
  createdAtIdx: index("shares_created_at_idx").on(table.createdAt),
}));

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true });
export const insertReceiptSchema = createInsertSchema(receipts).omit({ id: true, createdAt: true });
export const insertDishSchema = createInsertSchema(dishes).omit({ id: true });
export const insertDishInstanceSchema = createInsertSchema(dishInstances).omit({ id: true });
export const insertDishPhotoSchema = createInsertSchema(dishPhotos).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertUserFollowsSchema = createInsertSchema(userFollows).omit({ id: true, createdAt: true });
export const insertPhotoLikesSchema = createInsertSchema(photoLikes).omit({ id: true, createdAt: true });
export const insertDishBookmarksSchema = createInsertSchema(dishBookmarks).omit({ id: true, createdAt: true });
export const insertRestaurantBookmarksSchema = createInsertSchema(restaurantBookmarks).omit({ id: true, createdAt: true });
export const insertSharesSchema = createInsertSchema(shares).omit({ id: true, createdAt: true });

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
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = z.infer<typeof insertUserFollowsSchema>;
export type PhotoLike = typeof photoLikes.$inferSelect;
export type InsertPhotoLike = z.infer<typeof insertPhotoLikesSchema>;
export type DishBookmark = typeof dishBookmarks.$inferSelect;
export type InsertDishBookmark = z.infer<typeof insertDishBookmarksSchema>;
export type RestaurantBookmark = typeof restaurantBookmarks.$inferSelect;
export type InsertRestaurantBookmark = z.infer<typeof insertRestaurantBookmarksSchema>;
export type Share = typeof shares.$inferSelect;
export type InsertShare = z.infer<typeof insertSharesSchema>;

// Drizzle Relations

export const usersRelations = relations(users, ({ many }) => ({
  postedPhotos: many(dishPhotos, { relationName: "postedByUser" }),
  photoLikes: many(photoLikes),
  followedBy: many(userFollows, { relationName: "follower" }),
  following: many(userFollows, { relationName: "following" }),
  dishBookmarks: many(dishBookmarks),
  restaurantBookmarks: many(restaurantBookmarks),
  sentShares: many(shares, { relationName: "sender" }),
  receivedShares: many(shares, { relationName: "recipient" }),
  sharedProfiles: many(shares, { relationName: "sharedUser" }),
}));

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  dishes: many(dishes),
  receipts: many(receipts),
  bookmarks: many(restaurantBookmarks),
}));

export const dishesRelations = relations(dishes, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [dishes.restaurantId],
    references: [restaurants.id],
  }),
  photos: many(dishPhotos, { relationName: "dishPhotos" }),
  bookmarks: many(dishBookmarks),
}));

export const dishPhotosRelations = relations(dishPhotos, ({ one, many }) => ({
  dish: one(dishes, {
    fields: [dishPhotos.dishId],
    references: [dishes.id],
    relationName: "dishPhotos",
  }),
  dishInstance: one(dishInstances, {
    fields: [dishPhotos.dishInstanceId],
    references: [dishInstances.id],
  }),
  postedByUser: one(users, {
    fields: [dishPhotos.postedByUserId],
    references: [users.id],
    relationName: "postedByUser",
  }),
  likes: many(photoLikes),
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [receipts.restaurantId],
    references: [restaurants.id],
  }),
  dishInstances: many(dishInstances),
}));

export const dishInstancesRelations = relations(dishInstances, ({ one, many }) => ({
  dish: one(dishes, {
    fields: [dishInstances.dishId],
    references: [dishes.id],
  }),
  receipt: one(receipts, {
    fields: [dishInstances.receiptId],
    references: [receipts.id],
  }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [userFollows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const photoLikesRelations = relations(photoLikes, ({ one }) => ({
  photo: one(dishPhotos, {
    fields: [photoLikes.dishPhotoId],
    references: [dishPhotos.id],
  }),
  user: one(users, {
    fields: [photoLikes.userId],
    references: [users.id],
  }),
}));

export const dishBookmarksRelations = relations(dishBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [dishBookmarks.userId],
    references: [users.id],
  }),
  dish: one(dishes, {
    fields: [dishBookmarks.dishId],
    references: [dishes.id],
  }),
}));

export const restaurantBookmarksRelations = relations(restaurantBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [restaurantBookmarks.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [restaurantBookmarks.restaurantId],
    references: [restaurants.id],
  }),
}));

export const sharesRelations = relations(shares, ({ one }) => ({
  sender: one(users, {
    fields: [shares.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [shares.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  dish: one(dishes, {
    fields: [shares.dishId],
    references: [dishes.id],
  }),
  dishInstance: one(dishInstances, {
    fields: [shares.dishInstanceId],
    references: [dishInstances.id],
  }),
  restaurant: one(restaurants, {
    fields: [shares.restaurantId],
    references: [restaurants.id],
  }),
  sharedUser: one(users, {
    fields: [shares.sharedUserId],
    references: [users.id],
    relationName: "sharedUser",
  }),
}));

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
