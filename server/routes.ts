import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { parseReceiptImage } from "./receiptParser";
import { ratingEnum } from "@shared/schema";
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

      const dishInstances = [];
      for (const item of data.lineItems) {
        let dish = await storage.getDishByRestaurantAndName(restaurant.id, item.dishName);
        if (!dish) {
          dish = await storage.createDish({
            restaurantId: restaurant.id,
            name: item.dishName,
          });
        }

        const dishInstance = await storage.createDishInstance({
          dishId: dish.id,
          receiptId: receipt.id,
          price: item.price?.toString() || null,
          rating: null,
        });

        dishInstances.push({ ...dishInstance, dish });
      }

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
      dishInstances.forEach((di) => {
        const receipt = receipts.find((r) => r.id === di.receiptId);
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

  return httpServer;
}
