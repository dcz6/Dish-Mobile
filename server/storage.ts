import { randomUUID } from "crypto";
import type {
  Restaurant,
  InsertRestaurant,
  Receipt,
  InsertReceipt,
  Dish,
  InsertDish,
  DishInstance,
  InsertDishInstance,
  DishPhoto,
  InsertDishPhoto,
  ReceiptWithDetails,
  DishPhotoWithDetails,
} from "@shared/schema";

export interface IStorage {
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByName(name: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getAllRestaurants(): Promise<Restaurant[]>;

  getReceipt(id: string): Promise<Receipt | undefined>;
  getReceiptWithDetails(id: string): Promise<ReceiptWithDetails | undefined>;
  getAllReceipts(): Promise<Receipt[]>;
  getAllReceiptsWithDetails(): Promise<ReceiptWithDetails[]>;
  getRecentReceipts(limit?: number): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;

  getDish(id: string): Promise<Dish | undefined>;
  getDishByRestaurantAndName(restaurantId: string, name: string): Promise<Dish | undefined>;
  createDish(dish: InsertDish): Promise<Dish>;
  getAllDishes(): Promise<Dish[]>;

  getDishInstance(id: string): Promise<DishInstance | undefined>;
  getDishInstancesByReceipt(receiptId: string): Promise<(DishInstance & { dish: Dish })[]>;
  createDishInstance(instance: InsertDishInstance): Promise<DishInstance>;
  updateDishInstance(id: string, updates: Partial<DishInstance>): Promise<DishInstance | undefined>;
  deleteDishInstance(id: string): Promise<boolean>;
  getAllDishInstances(): Promise<DishInstance[]>;

  updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt | undefined>;
  deleteReceipt(id: string): Promise<boolean>;

  getDishPhoto(id: string): Promise<DishPhoto | undefined>;
  getAllDishPhotos(): Promise<DishPhoto[]>;
  getAllDishPhotosWithDetails(): Promise<DishPhotoWithDetails[]>;
  getUnlinkedDishPhotos(): Promise<DishPhoto[]>;
  createDishPhoto(photo: InsertDishPhoto): Promise<DishPhoto>;
  updateDishPhoto(id: string, updates: Partial<DishPhoto>): Promise<DishPhoto | undefined>;
}

export class MemStorage implements IStorage {
  private restaurants: Map<string, Restaurant> = new Map();
  private receipts: Map<string, Receipt> = new Map();
  private dishes: Map<string, Dish> = new Map();
  private dishInstances: Map<string, DishInstance> = new Map();
  private dishPhotos: Map<string, DishPhoto> = new Map();

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async getRestaurantByName(name: string): Promise<Restaurant | undefined> {
    return Array.from(this.restaurants.values()).find(
      (r) => r.name.toLowerCase() === name.toLowerCase()
    );
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const id = randomUUID();
    const newRestaurant: Restaurant = {
      id,
      name: restaurant.name,
      address: restaurant.address ?? null,
    };
    this.restaurants.set(id, newRestaurant);
    return newRestaurant;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values());
  }

  async getReceipt(id: string): Promise<Receipt | undefined> {
    return this.receipts.get(id);
  }

  async getReceiptWithDetails(id: string): Promise<ReceiptWithDetails | undefined> {
    const receipt = this.receipts.get(id);
    if (!receipt) return undefined;

    const restaurant = this.restaurants.get(receipt.restaurantId);
    if (!restaurant) return undefined;

    const dishInstances = await this.getDishInstancesByReceipt(id);
    const dishInstancesWithPhotos = dishInstances.map((di) => {
      const photo = Array.from(this.dishPhotos.values()).find(
        (p) => p.dishInstanceId === di.id
      );
      return { ...di, photo };
    });

    return {
      ...receipt,
      restaurant,
      dishInstances: dishInstancesWithPhotos,
    };
  }

  async getAllReceipts(): Promise<Receipt[]> {
    return Array.from(this.receipts.values()).sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
  }

  async getAllReceiptsWithDetails(): Promise<ReceiptWithDetails[]> {
    const receipts = await this.getAllReceipts();
    const results: ReceiptWithDetails[] = [];

    for (const receipt of receipts) {
      const details = await this.getReceiptWithDetails(receipt.id);
      if (details) results.push(details);
    }

    return results;
  }

  async getRecentReceipts(limit = 10): Promise<Receipt[]> {
    const all = await this.getAllReceipts();
    return all.slice(0, limit);
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const id = randomUUID();
    const newReceipt: Receipt = {
      id,
      restaurantId: receipt.restaurantId,
      datetime: receipt.datetime,
      totalAmount: receipt.totalAmount ?? null,
      rawLlmOutput: receipt.rawLlmOutput ?? null,
      createdAt: new Date(),
    };
    this.receipts.set(id, newReceipt);
    return newReceipt;
  }

  async updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt | undefined> {
    const existing = this.receipts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.receipts.set(id, updated);
    return updated;
  }

  async deleteReceipt(id: string): Promise<boolean> {
    const exists = this.receipts.has(id);
    if (!exists) return false;

    // Delete associated dish instances
    const instances = await this.getDishInstancesByReceipt(id);
    for (const instance of instances) {
      await this.deleteDishInstance(instance.id);
    }

    this.receipts.delete(id);
    return true;
  }

  async getDish(id: string): Promise<Dish | undefined> {
    return this.dishes.get(id);
  }

  async getDishByRestaurantAndName(restaurantId: string, name: string): Promise<Dish | undefined> {
    return Array.from(this.dishes.values()).find(
      (d) => d.restaurantId === restaurantId && d.name.toLowerCase() === name.toLowerCase()
    );
  }

  async createDish(dish: InsertDish): Promise<Dish> {
    const id = randomUUID();
    const newDish: Dish = {
      id,
      restaurantId: dish.restaurantId,
      name: dish.name,
    };
    this.dishes.set(id, newDish);
    return newDish;
  }

  async getAllDishes(): Promise<Dish[]> {
    return Array.from(this.dishes.values());
  }

  async getDishInstance(id: string): Promise<DishInstance | undefined> {
    return this.dishInstances.get(id);
  }

  async getDishInstancesByReceipt(receiptId: string): Promise<(DishInstance & { dish: Dish })[]> {
    const instances = Array.from(this.dishInstances.values()).filter(
      (di) => di.receiptId === receiptId
    );
    return instances.map((di) => ({
      ...di,
      dish: this.dishes.get(di.dishId)!,
    }));
  }

  async createDishInstance(instance: InsertDishInstance): Promise<DishInstance> {
    const id = randomUUID();
    const newInstance: DishInstance = {
      id,
      dishId: instance.dishId,
      receiptId: instance.receiptId,
      price: instance.price ?? null,
      rating: instance.rating ?? null,
    };
    this.dishInstances.set(id, newInstance);
    return newInstance;
  }

  async updateDishInstance(id: string, updates: Partial<DishInstance>): Promise<DishInstance | undefined> {
    const existing = this.dishInstances.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.dishInstances.set(id, updated);
    return updated;
  }

  async deleteDishInstance(id: string): Promise<boolean> {
    const exists = this.dishInstances.has(id);
    if (!exists) return false;

    // Unlink photos
    for (const photo of this.dishPhotos.values()) {
      if (photo.dishInstanceId === id) {
        const updated = { ...photo, dishInstanceId: null };
        this.dishPhotos.set(photo.id, updated);
      }
    }

    this.dishInstances.delete(id);
    return true;
  }

  async getAllDishInstances(): Promise<DishInstance[]> {
    return Array.from(this.dishInstances.values());
  }

  async getDishPhoto(id: string): Promise<DishPhoto | undefined> {
    return this.dishPhotos.get(id);
  }

  async getAllDishPhotos(): Promise<DishPhoto[]> {
    return Array.from(this.dishPhotos.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAllDishPhotosWithDetails(): Promise<DishPhotoWithDetails[]> {
    const photos = await this.getAllDishPhotos();
    return photos.map((photo) => {
      if (!photo.dishInstanceId) return photo;

      const dishInstance = this.dishInstances.get(photo.dishInstanceId);
      if (!dishInstance) return photo;

      const dish = this.dishes.get(dishInstance.dishId);
      if (!dish) return photo;

      const receipt = this.receipts.get(dishInstance.receiptId);
      if (!receipt) return photo;

      const restaurant = this.restaurants.get(receipt.restaurantId);
      if (!restaurant) return photo;

      return {
        ...photo,
        dishInstance: {
          ...dishInstance,
          dish,
          receipt: {
            ...receipt,
            restaurant,
          },
        },
      };
    });
  }

  async getUnlinkedDishPhotos(): Promise<DishPhoto[]> {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    return Array.from(this.dishPhotos.values())
      .filter((p) => !p.dishInstanceId && new Date(p.createdAt).getTime() > twentyFourHoursAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createDishPhoto(photo: InsertDishPhoto): Promise<DishPhoto> {
    const id = randomUUID();
    const newPhoto: DishPhoto = {
      id,
      imageUrl: photo.imageUrl,
      dishInstanceId: photo.dishInstanceId ?? null,
      createdAt: new Date(),
    };
    this.dishPhotos.set(id, newPhoto);
    return newPhoto;
  }

  async updateDishPhoto(id: string, updates: Partial<DishPhoto>): Promise<DishPhoto | undefined> {
    const existing = this.dishPhotos.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.dishPhotos.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
