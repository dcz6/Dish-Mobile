import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { parseReceiptImage } from "./receiptParser";
import { ratingEnum, type InsertDish } from "@shared/schema";
import type { ParsedReceipt } from "@shared/schema";

const parseReceiptBodySchema = z.object({
  image: z.string().min(1, "Image is required"),
});

const parsedReceiptSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required"),
  restaurantAddress: z.string().optional(),
  datetime: z.string(),
  total: z.number().nullable(),
  lineItems: z.array(z.object({
    dishName: z.string().min(1, "Dish name is required"),
    price: z.number().nullable(),
  })),
});

const updateDishInstanceSchema = z.object({
  rating: ratingEnum.optional(),
  price: z.number().nullable().optional(),
  dishName: z.string().optional(),
});

const updateReceiptSchema = z.object({
  datetime: z.string().optional(),
  total: z.number().nullable().optional(),
  restaurantName: z.string().optional(),
});

const createDishPhotoSchema = z.object({
  imageUrl: z.string().min(1, "Image URL is required"),
  dishInstanceId: z.string().nullable().optional(),
});

const updateDishPhotoSchema = z.object({
  dishInstanceId: z.string().nullable(),
});

// Social feature validation schemas
const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

const followUserSchema = z.object({
  followingId: z.string(),
});

const likePhotoSchema = z.object({
  userId: z.string(),
});

const bookmarkDishSchema = z.object({
  dishId: z.string(),
});

const bookmarkRestaurantSchema = z.object({
  restaurantId: z.string(),
});

const createShareSchema = z.object({
  senderId: z.string(),
  recipientId: z.string(),
  shareType: z.enum(["dish", "dish_instance", "restaurant", "user_profile"]),
  dishId: z.string().optional(),
  dishInstanceId: z.string().optional(),
  restaurantId: z.string().optional(),
  sharedUserId: z.string().optional(),
  message: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/parse-receipt", async (req, res) => {
    try {
      const result = parseReceiptBodySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      const parsed = await parseReceiptImage(result.data.image);
      res.json(parsed);
    } catch (error) {
      console.error("Receipt parsing error:", error);
      res.status(500).json({ error: "Failed to parse receipt" });
    }
  });

  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/receipts", async (req, res) => {
    try {
      const receipts = await storage.getAllReceiptsWithDetails();
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.get("/api/receipts/recent", async (req, res) => {
    try {
      const receipts = await storage.getRecentReceipts(10);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent receipts" });
    }
  });

  app.get("/api/receipts/:id", async (req, res) => {
    try {
      const receipt = await storage.getReceiptWithDetails(req.params.id);
      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  });

  app.post("/api/receipts", async (req, res) => {
    try {
      const result = parsedReceiptSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      const data = result.data;

      let restaurant = await storage.getRestaurantByName(data.restaurantName);
      if (!restaurant) {
        restaurant = await storage.createRestaurant({
          name: data.restaurantName,
          address: data.restaurantAddress || null,
        });
      }

      const receipt = await storage.createReceipt({
        restaurantId: restaurant.id,
        datetime: new Date(data.datetime),
        totalAmount: data.total?.toString() || null,
        rawLlmOutput: data,
      });

      // Optimizing to avoid N+1 queries
      const dishNames = data.lineItems.map(item => item.dishName);
      const existingDishes = await storage.getDishesByRestaurantAndNames(restaurant.id, dishNames);
      const existingDishesMap = new Map(existingDishes.map(d => [d.name.toLowerCase(), d]));

      const dishesToCreate: InsertDish[] = [];

      // Identify missing dishes and prepare final list order
      for (const item of data.lineItems) {
        let dish = existingDishesMap.get(item.dishName.toLowerCase());
        if (!dish) {
           // check if we already marked it for creation to avoid duplicates
           const pendingDish = dishesToCreate.find(d => d.name.toLowerCase() === item.dishName.toLowerCase());
           if (pendingDish) {
             // We can't link it yet because it doesn't have an ID, but we know it will be created.
             // We'll handle mapping after creation.
           } else {
             dishesToCreate.push({
               restaurantId: restaurant.id,
               name: item.dishName,
             });
           }
        }
      }

      // Bulk create missing dishes
      const newDishes = await storage.createDishes(dishesToCreate);
      const newDishesMap = new Map(newDishes.map(d => [d.name.toLowerCase(), d]));

      // Merge maps
      const allDishesMap = new Map(existingDishesMap);
      newDishesMap.forEach((val, key) => {
        allDishesMap.set(key, val);
      });

      // Create dish instances
      const dishInstancesToCreate = data.lineItems.map(item => {
        const dish = allDishesMap.get(item.dishName.toLowerCase());
        if (!dish) throw new Error(`Dish not found for ${item.dishName} after creation`);
        return {
          dishId: dish.id,
          receiptId: receipt.id,
          price: item.price?.toString() || null,
          rating: null,
        };
      });

      const createdDishInstances = await storage.createDishInstances(dishInstancesToCreate);

      // Combine for response
      const dishInstances = createdDishInstances.map((instance, index) => {
         const item = data.lineItems[index];
         const dish = allDishesMap.get(item.dishName.toLowerCase())!;
         return { ...instance, dish };
      });

      res.json({ receipt, dishInstances });
    } catch (error) {
      console.error("Create receipt error:", error);
      res.status(500).json({ error: "Failed to create receipt" });
    }
  });

  app.get("/api/dishes", async (req, res) => {
    try {
      const dishes = await storage.getAllDishes();
      res.json(dishes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dishes" });
    }
  });

  app.get("/api/dish-instances/:id", async (req, res) => {
    try {
      const instance = await storage.getDishInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: "Dish instance not found" });
      }
      res.json(instance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dish instance" });
    }
  });

  app.patch("/api/dish-instances/:id", async (req, res) => {
    try {
      const result = updateDishInstanceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const id = req.params.id;
      const currentInstance = await storage.getDishInstance(id);
      if (!currentInstance) {
        return res.status(404).json({ error: "Dish instance not found" });
      }

      let updates: any = {};
      if (result.data.rating !== undefined) updates.rating = result.data.rating;
      if (result.data.price !== undefined) updates.price = result.data.price?.toString() || null;

      if (result.data.dishName) {
        // Handle dish name change
        const receipt = await storage.getReceipt(currentInstance.receiptId);
        if (receipt) {
          let dish = await storage.getDishByRestaurantAndName(receipt.restaurantId, result.data.dishName);
          if (!dish) {
            dish = await storage.createDish({
              restaurantId: receipt.restaurantId,
              name: result.data.dishName,
            });
          }
          updates.dishId = dish.id;
        }
      }

      const updated = await storage.updateDishInstance(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Dish instance not found" });
      }

      // Fetch the updated instance with dish details
      const dish = await storage.getDish(updated.dishId);
      res.json({ ...updated, dish });
    } catch (error) {
      console.error("Update dish instance error:", error);
      res.status(500).json({ error: "Failed to update dish instance" });
    }
  });

  app.delete("/api/dish-instances/:id", async (req, res) => {
    try {
      const success = await storage.deleteDishInstance(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Dish instance not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dish instance" });
    }
  });

  app.patch("/api/receipts/:id", async (req, res) => {
    try {
      const result = updateReceiptSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const id = req.params.id;
      const currentReceipt = await storage.getReceipt(id);
      if (!currentReceipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }

      let updates: any = {};
      if (result.data.datetime) updates.datetime = new Date(result.data.datetime);
      if (result.data.total !== undefined) updates.totalAmount = result.data.total?.toString() || null;

      if (result.data.restaurantName) {
        let restaurant = await storage.getRestaurantByName(result.data.restaurantName);
        if (!restaurant) {
          restaurant = await storage.createRestaurant({
            name: result.data.restaurantName,
            address: null,
          });
        }

        if (restaurant.id !== currentReceipt.restaurantId) {
          updates.restaurantId = restaurant.id;

          // Migrate dish instances to the new restaurant
          const dishInstances = await storage.getDishInstancesByReceipt(id);
          for (const instance of dishInstances) {
            const currentDish = instance.dish; // storage.getDishInstancesByReceipt returns details

            // Find or create dish in the new restaurant with the same name
            let newDish = await storage.getDishByRestaurantAndName(restaurant.id, currentDish.name);
            if (!newDish) {
              newDish = await storage.createDish({
                restaurantId: restaurant.id,
                name: currentDish.name,
              });
            }

            await storage.updateDishInstance(instance.id, { dishId: newDish.id });
          }
        }
      }

      const updated = await storage.updateReceipt(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update receipt error:", error);
      res.status(500).json({ error: "Failed to update receipt" });
    }
  });

  app.delete("/api/receipts/:id", async (req, res) => {
    try {
      const success = await storage.deleteReceipt(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete receipt" });
    }
  });

  app.get("/api/dish-photos", async (req, res) => {
    try {
      const photos = await storage.getAllDishPhotosWithDetails();
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dish photos" });
    }
  });

  app.get("/api/dish-photos/unlinked", async (req, res) => {
    try {
      const photos = await storage.getUnlinkedDishPhotos();
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unlinked photos" });
    }
  });

  app.post("/api/dish-photos", async (req, res) => {
    try {
      const result = createDishPhotoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      const photo = await storage.createDishPhoto({
        imageUrl: result.data.imageUrl,
        dishInstanceId: result.data.dishInstanceId || null,
      });
      res.json(photo);
    } catch (error) {
      res.status(500).json({ error: "Failed to create dish photo" });
    }
  });

  app.patch("/api/dish-photos/:id", async (req, res) => {
    try {
      const result = updateDishPhotoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      
      if (result.data.dishInstanceId) {
        const dishInstance = await storage.getDishInstance(result.data.dishInstanceId);
        if (!dishInstance) {
          return res.status(400).json({ error: "Dish instance not found" });
        }
      }
      
      const updated = await storage.updateDishPhoto(req.params.id, { dishInstanceId: result.data.dishInstanceId });
      if (!updated) {
        return res.status(404).json({ error: "Dish photo not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update dish photo" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const [dishes, receipts, restaurants, dishInstances, photos] = await Promise.all([
        storage.getAllDishes(),
        storage.getAllReceipts(),
        storage.getAllRestaurants(),
        storage.getAllDishInstances(),
        storage.getAllDishPhotos(),
      ]);

      const ratingBreakdown: Record<string, number> = {
        "Elite": 0,
        "Would order again": 0,
        "Should try once": 0,
        "Not for me": 0,
      };

      dishInstances.forEach((di) => {
        if (di.rating && ratingBreakdown[di.rating] !== undefined) {
          ratingBreakdown[di.rating]++;
        }
      });

      const totalSpend = receipts.reduce((sum, r) => {
        const amount = r.totalAmount ? parseFloat(r.totalAmount) : 0;
        return sum + amount;
      }, 0);

      const monthlyDishes: Record<string, number> = {};
      const receiptsMap = new Map(receipts.map((r) => [r.id, r]));

      dishInstances.forEach((di) => {
        const receipt = receiptsMap.get(di.receiptId);
        if (receipt) {
          const month = new Date(receipt.datetime).toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          });
          monthlyDishes[month] = (monthlyDishes[month] || 0) + 1;
        }
      });

      const dishesPerMonth = Object.entries(monthlyDishes)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => {
          const [aMonth, aYear] = a.month.split(" ");
          const [bMonth, bYear] = b.month.split(" ");
          const aDate = new Date(`${aMonth} 1, 20${aYear}`);
          const bDate = new Date(`${bMonth} 1, 20${bYear}`);
          return aDate.getTime() - bDate.getTime();
        });

      res.json({
        totalDishes: photos.length,
        totalReceipts: receipts.length,
        totalRestaurants: restaurants.length,
        totalSpend,
        ratingBreakdown,
        dishesPerMonth,
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ========== USER ROUTES ==========
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const result = createUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const existing = await storage.getUserByUsername(result.data.username);
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const user = await storage.createUser(result.data);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // ========== FOLLOW ROUTES ==========
  app.post("/api/users/:userId/follow", async (req, res) => {
    try {
      const result = followUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const followerId = req.params.userId;
      const followingId = result.data.followingId;

      if (followerId === followingId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }

      const follow = await storage.followUser(followerId, followingId);
      res.json(follow);
    } catch (error) {
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:userId/follow/:followingId", async (req, res) => {
    try {
      const success = await storage.unfollowUser(req.params.userId, req.params.followingId);
      if (!success) {
        return res.status(404).json({ error: "Follow relationship not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  app.get("/api/users/:userId/followers", async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.params.userId);
      res.json(followers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    try {
      const following = await storage.getFollowing(req.params.userId);
      res.json(following);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  app.get("/api/users/:userId/follow-stats", async (req, res) => {
    try {
      const stats = await storage.getFollowStats(req.params.userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch follow stats" });
    }
  });

  app.get("/api/users/:followerId/is-following/:followingId", async (req, res) => {
    try {
      const isFollowing = await storage.isFollowing(req.params.followerId, req.params.followingId);
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  // ========== LIKE ROUTES ==========
  app.post("/api/photos/:photoId/like", async (req, res) => {
    try {
      const result = likePhotoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const like = await storage.likePhoto(result.data.userId, req.params.photoId);
      res.json(like);
    } catch (error) {
      res.status(500).json({ error: "Failed to like photo" });
    }
  });

  app.delete("/api/photos/:photoId/like/:userId", async (req, res) => {
    try {
      const success = await storage.unlikePhoto(req.params.userId, req.params.photoId);
      if (!success) {
        return res.status(404).json({ error: "Like not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unlike photo" });
    }
  });

  app.get("/api/photos/:photoId/likes", async (req, res) => {
    try {
      const likes = await storage.getPhotoLikes(req.params.photoId);
      res.json(likes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch likes" });
    }
  });

  app.get("/api/photos/:photoId/likes/count", async (req, res) => {
    try {
      const count = await storage.getPhotoLikeCount(req.params.photoId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch like count" });
    }
  });

  app.get("/api/photos/:photoId/liked-by/:userId", async (req, res) => {
    try {
      const isLiked = await storage.isPhotoLikedByUser(req.params.photoId, req.params.userId);
      res.json({ isLiked });
    } catch (error) {
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  app.get("/api/users/:userId/likes", async (req, res) => {
    try {
      const likes = await storage.getUserLikes(req.params.userId);
      res.json(likes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user likes" });
    }
  });

  // ========== BOOKMARK ROUTES (DISHES) ==========
  app.post("/api/users/:userId/bookmarks/dishes", async (req, res) => {
    try {
      const result = bookmarkDishSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const bookmark = await storage.bookmarkDish(req.params.userId, result.data.dishId);
      res.json(bookmark);
    } catch (error) {
      res.status(500).json({ error: "Failed to bookmark dish" });
    }
  });

  app.delete("/api/users/:userId/bookmarks/dishes/:dishId", async (req, res) => {
    try {
      const success = await storage.unbookmarkDish(req.params.userId, req.params.dishId);
      if (!success) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  });

  app.get("/api/users/:userId/bookmarks/dishes", async (req, res) => {
    try {
      const bookmarks = await storage.getUserDishBookmarks(req.params.userId);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dish bookmarks" });
    }
  });

  app.get("/api/users/:userId/bookmarks/dishes/:dishId/status", async (req, res) => {
    try {
      const isBookmarked = await storage.isDishBookmarked(req.params.userId, req.params.dishId);
      res.json({ isBookmarked });
    } catch (error) {
      res.status(500).json({ error: "Failed to check bookmark status" });
    }
  });

  // ========== BOOKMARK ROUTES (RESTAURANTS) ==========
  app.post("/api/users/:userId/bookmarks/restaurants", async (req, res) => {
    try {
      const result = bookmarkRestaurantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const bookmark = await storage.bookmarkRestaurant(req.params.userId, result.data.restaurantId);
      res.json(bookmark);
    } catch (error) {
      res.status(500).json({ error: "Failed to bookmark restaurant" });
    }
  });

  app.delete("/api/users/:userId/bookmarks/restaurants/:restaurantId", async (req, res) => {
    try {
      const success = await storage.unbookmarkRestaurant(req.params.userId, req.params.restaurantId);
      if (!success) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  });

  app.get("/api/users/:userId/bookmarks/restaurants", async (req, res) => {
    try {
      const bookmarks = await storage.getUserRestaurantBookmarks(req.params.userId);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant bookmarks" });
    }
  });

  app.get("/api/users/:userId/bookmarks/restaurants/:restaurantId/status", async (req, res) => {
    try {
      const isBookmarked = await storage.isRestaurantBookmarked(req.params.userId, req.params.restaurantId);
      res.json({ isBookmarked });
    } catch (error) {
      res.status(500).json({ error: "Failed to check bookmark status" });
    }
  });

  // ========== SHARE ROUTES ==========
  app.post("/api/shares", async (req, res) => {
    try {
      const result = createShareSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const share = await storage.createShare(result.data);
      res.json(share);
    } catch (error) {
      res.status(500).json({ error: "Failed to create share" });
    }
  });

  app.get("/api/users/:userId/inbox", async (req, res) => {
    try {
      const unreadOnly = req.query.unreadOnly === "true";
      const shares = await storage.getUserInbox(req.params.userId, unreadOnly);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  app.patch("/api/shares/:id/read", async (req, res) => {
    try {
      const share = await storage.markShareAsRead(req.params.id);
      if (!share) {
        return res.status(404).json({ error: "Share not found" });
      }
      res.json(share);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark share as read" });
    }
  });

  app.delete("/api/shares/:id", async (req, res) => {
    try {
      const success = await storage.deleteShare(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Share not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete share" });
    }
  });

  app.get("/api/shares/:id", async (req, res) => {
    try {
      const share = await storage.getShareById(req.params.id);
      if (!share) {
        return res.status(404).json({ error: "Share not found" });
      }
      res.json(share);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch share" });
    }
  });

  // ========== AGGREGATION & SPECIAL FEATURE ROUTES ==========
  app.get("/api/restaurants/:id/dishes", async (req, res) => {
    try {
      const restaurantWithDishes = await storage.getRestaurantWithDishes(req.params.id);
      if (!restaurantWithDishes) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurantWithDishes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant dishes" });
    }
  });

  app.get("/api/dishes/:dishId/photos", async (req, res) => {
    try {
      const photos = await storage.getDishPhotosWithDetails(req.params.dishId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dish photos" });
    }
  });

  app.get("/api/users/:userId/profile-stats", async (req, res) => {
    try {
      const stats = await storage.getUserProfileStats(req.params.userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile stats" });
    }
  });

  app.get("/api/users/:userId/feed", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const photos = await storage.getFeedPhotos(req.params.userId, limit, offset);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feed" });
    }
  });

  // ========== SEARCH ROUTES ==========
  app.get("/api/search/users", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const users = await storage.searchUsers(query, limit);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.get("/api/search/dishes", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const dishes = await storage.searchDishes(query, limit);
      res.json(dishes);
    } catch (error) {
      res.status(500).json({ error: "Failed to search dishes" });
    }
  });

  app.get("/api/search/restaurants", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const restaurants = await storage.searchRestaurants(query, limit);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to search restaurants" });
    }
  });

  return httpServer;
}
