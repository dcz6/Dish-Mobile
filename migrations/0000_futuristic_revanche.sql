CREATE TABLE "dish_bookmarks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dish_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dish_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_id" varchar NOT NULL,
	"receipt_id" varchar NOT NULL,
	"price" numeric(10, 2),
	"rating" text
);
--> statement-breakpoint
CREATE TABLE "dish_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_instance_id" varchar,
	"dish_id" varchar NOT NULL,
	"posted_by_user_id" varchar NOT NULL,
	"image_url" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "photo_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_photo_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"datetime" timestamp NOT NULL,
	"total_amount" numeric(10, 2),
	"raw_llm_output" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_bookmarks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar NOT NULL,
	"share_type" text NOT NULL,
	"dish_id" varchar,
	"dish_instance_id" varchar,
	"restaurant_id" varchar,
	"shared_user_id" varchar,
	"message" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" varchar NOT NULL,
	"following_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "dish_bookmarks" ADD CONSTRAINT "dish_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_bookmarks" ADD CONSTRAINT "dish_bookmarks_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_instances" ADD CONSTRAINT "dish_instances_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_instances" ADD CONSTRAINT "dish_instances_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_photos" ADD CONSTRAINT "dish_photos_dish_instance_id_dish_instances_id_fk" FOREIGN KEY ("dish_instance_id") REFERENCES "public"."dish_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_photos" ADD CONSTRAINT "dish_photos_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_photos" ADD CONSTRAINT "dish_photos_posted_by_user_id_users_id_fk" FOREIGN KEY ("posted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_likes" ADD CONSTRAINT "photo_likes_dish_photo_id_dish_photos_id_fk" FOREIGN KEY ("dish_photo_id") REFERENCES "public"."dish_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_likes" ADD CONSTRAINT "photo_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_bookmarks" ADD CONSTRAINT "restaurant_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_bookmarks" ADD CONSTRAINT "restaurant_bookmarks_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_dish_instance_id_dish_instances_id_fk" FOREIGN KEY ("dish_instance_id") REFERENCES "public"."dish_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_shared_user_id_users_id_fk" FOREIGN KEY ("shared_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dish_bookmarks_user_dish_unique" ON "dish_bookmarks" USING btree ("user_id","dish_id");--> statement-breakpoint
CREATE INDEX "dish_bookmarks_user_id_idx" ON "dish_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dish_photos_dish_id_idx" ON "dish_photos" USING btree ("dish_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photo_likes_photo_user_unique" ON "photo_likes" USING btree ("dish_photo_id","user_id");--> statement-breakpoint
CREATE INDEX "photo_likes_user_id_idx" ON "photo_likes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_bookmarks_user_restaurant_unique" ON "restaurant_bookmarks" USING btree ("user_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_bookmarks_user_id_idx" ON "restaurant_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shares_recipient_id_idx" ON "shares" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "shares_created_at_idx" ON "shares" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_follower_following_unique" ON "user_follows" USING btree ("follower_id","following_id");