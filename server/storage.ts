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
  User,
  InsertUser,
  UserFollow,
  PhotoLike,
  DishBookmark,
  RestaurantBookmark,
  Share,
  InsertShare,
} from "@shared/schema";
import { TEST_USER_ID } from "@shared/schema";

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
  getDishesByRestaurantAndNames(restaurantId: string, names: string[]): Promise<Dish[]>;
  createDish(dish: InsertDish): Promise<Dish>;
  createDishes(dishes: InsertDish[]): Promise<Dish[]>;
  getAllDishes(): Promise<Dish[]>;

  getDishInstance(id: string): Promise<DishInstance | undefined>;
  getDishInstancesByReceipt(receiptId: string): Promise<(DishInstance & { dish: Dish })[]>;
  createDishInstance(instance: InsertDishInstance): Promise<DishInstance>;
  createDishInstances(instances: InsertDishInstance[]): Promise<DishInstance[]>;
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

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Follow operations
  followUser(followerId: string, followingId: string): Promise<UserFollow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<UserFollow[]>;
  getFollowing(userId: string): Promise<UserFollow[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowStats(userId: string): Promise<{ followerCount: number; followingCount: number }>;

  // Like operations
  likePhoto(userId: string, photoId: string): Promise<PhotoLike>;
  unlikePhoto(userId: string, photoId: string): Promise<boolean>;
  getPhotoLikes(photoId: string): Promise<PhotoLike[]>;
  getUserLikes(userId: string): Promise<PhotoLike[]>;
  isPhotoLikedByUser(photoId: string, userId: string): Promise<boolean>;
  getPhotoLikeCount(photoId: string): Promise<number>;

  // Dish bookmark operations
  bookmarkDish(userId: string, dishId: string): Promise<DishBookmark>;
  unbookmarkDish(userId: string, dishId: string): Promise<boolean>;
  getUserDishBookmarks(userId: string): Promise<DishBookmark[]>;
  isDishBookmarked(userId: string, dishId: string): Promise<boolean>;

  // Restaurant bookmark operations
  bookmarkRestaurant(userId: string, restaurantId: string): Promise<RestaurantBookmark>;
  unbookmarkRestaurant(userId: string, restaurantId: string): Promise<boolean>;
  getUserRestaurantBookmarks(userId: string): Promise<RestaurantBookmark[]>;
  isRestaurantBookmarked(userId: string, restaurantId: string): Promise<boolean>;

  // Share operations
  createShare(share: InsertShare): Promise<Share>;
  getUserInbox(userId: string, unreadOnly?: boolean): Promise<Share[]>;
  markShareAsRead(shareId: string): Promise<Share | undefined>;
  deleteShare(shareId: string): Promise<boolean>;
  getShareById(id: string): Promise<Share | undefined>;

  // Aggregation methods for special features
  getRestaurantWithDishes(restaurantId: string): Promise<any>; // Will define proper type later
  getDishPhotosWithDetails(dishId: string): Promise<DishPhotoWithDetails[]>;
  getUserProfileStats(userId: string): Promise<{
    photoCount: number;
    likeCount: number;
    followerCount: number;
    followingCount: number;
  }>;
  getFeedPhotos(userId: string, limit?: number, offset?: number): Promise<DishPhotoWithDetails[]>;
  searchUsers(query: string, limit?: number): Promise<User[]>;
  searchDishes(query: string, limit?: number): Promise<Dish[]>;
  searchRestaurants(query: string, limit?: number): Promise<Restaurant[]>;
}

export class MemStorage implements IStorage {
  private restaurants: Map<string, Restaurant> = new Map();
  private receipts: Map<string, Receipt> = new Map();
  private dishes: Map<string, Dish> = new Map();
  private dishInstances: Map<string, DishInstance> = new Map();
  private dishPhotos: Map<string, DishPhoto> = new Map();
  private dishPhotosByInstanceId: Map<string, DishPhoto[]> = new Map();

  // Social feature storage
  private users: Map<string, User> = new Map();
  private userFollows: Map<string, UserFollow> = new Map();
  private photoLikes: Map<string, PhotoLike> = new Map();
  private dishBookmarks: Map<string, DishBookmark> = new Map();
  private restaurantBookmarks: Map<string, RestaurantBookmark> = new Map();
  private shares: Map<string, Share> = new Map();

  // Secondary indexes for performance
  private userFollowsByFollower: Map<string, Set<string>> = new Map();
  private userFollowsByFollowing: Map<string, Set<string>> = new Map();
  private photoLikesByPhoto: Map<string, Set<string>> = new Map();
  private photoLikesByUser: Map<string, Set<string>> = new Map();
  private dishBookmarksByUser: Map<string, Set<string>> = new Map();
  private restaurantBookmarksByUser: Map<string, Set<string>> = new Map();
  private sharesByRecipient: Map<string, string[]> = new Map();

  constructor() {
    // Initialize with TEST_USER_ID for development
    const testUser: User = {
      id: TEST_USER_ID,
      username: "testuser",
      displayName: "Test User",
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.users.set(TEST_USER_ID, testUser);
  }

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
      const photos = this.dishPhotosByInstanceId.get(di.id);
      const photo = photos && photos.length > 0 ? photos[0] : undefined;
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
    const results = await Promise.all(
      receipts.map((receipt) => this.getReceiptWithDetails(receipt.id))
    );
    return results.filter((details): details is ReceiptWithDetails => !!details);
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

  async getDishesByRestaurantAndNames(restaurantId: string, names: string[]): Promise<Dish[]> {
    const lowerNames = new Set(names.map(n => n.toLowerCase()));
    return Array.from(this.dishes.values()).filter(
      (d) => d.restaurantId === restaurantId && lowerNames.has(d.name.toLowerCase())
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

  async createDishes(dishes: InsertDish[]): Promise<Dish[]> {
    return Promise.all(dishes.map(d => this.createDish(d)));
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

  async createDishInstances(instances: InsertDishInstance[]): Promise<DishInstance[]> {
    return Promise.all(instances.map(i => this.createDishInstance(i)));
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

    if (newPhoto.dishInstanceId) {
      if (!this.dishPhotosByInstanceId.has(newPhoto.dishInstanceId)) {
        this.dishPhotosByInstanceId.set(newPhoto.dishInstanceId, []);
      }
      this.dishPhotosByInstanceId.get(newPhoto.dishInstanceId)!.push(newPhoto);
    }

    return newPhoto;
  }

  async updateDishPhoto(id: string, updates: Partial<DishPhoto>): Promise<DishPhoto | undefined> {
    const existing = this.dishPhotos.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };

    // Update secondary index
    if (existing.dishInstanceId !== updated.dishInstanceId) {
      // Remove from old index
      if (existing.dishInstanceId) {
        const list = this.dishPhotosByInstanceId.get(existing.dishInstanceId);
        if (list) {
          const index = list.findIndex((p) => p.id === id);
          if (index !== -1) {
            list.splice(index, 1);
            if (list.length === 0) {
              this.dishPhotosByInstanceId.delete(existing.dishInstanceId);
            }
          }
        }
      }

      // Add to new index
      if (updated.dishInstanceId) {
        if (!this.dishPhotosByInstanceId.has(updated.dishInstanceId)) {
          this.dishPhotosByInstanceId.set(updated.dishInstanceId, []);
        }
        const list = this.dishPhotosByInstanceId.get(updated.dishInstanceId)!;
        list.push(updated);
        // Maintain sort order by createdAt to match original insertion order behavior
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    } else if (updated.dishInstanceId) {
      // If dishInstanceId is the same, just update the object in the list
      const list = this.dishPhotosByInstanceId.get(updated.dishInstanceId);
      if (list) {
        const index = list.findIndex((p) => p.id === id);
        if (index !== -1) {
          list[index] = updated;
        } else {
          // Should not happen if index is consistent, but for safety:
          list.push(updated);
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
      }
    }

    this.dishPhotos.set(id, updated);
    return updated;
  }

  // ============ USER OPERATIONS ============
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: User = {
      id,
      username: user.username,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // ============ FOLLOW OPERATIONS ============
  async followUser(followerId: string, followingId: string): Promise<UserFollow> {
    // Check if already following
    const existing = Array.from(this.userFollows.values()).find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (existing) return existing;

    const id = randomUUID();
    const follow: UserFollow = {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    this.userFollows.set(id, follow);

    // Update indexes
    if (!this.userFollowsByFollower.has(followerId)) {
      this.userFollowsByFollower.set(followerId, new Set());
    }
    this.userFollowsByFollower.get(followerId)!.add(id);

    if (!this.userFollowsByFollowing.has(followingId)) {
      this.userFollowsByFollowing.set(followingId, new Set());
    }
    this.userFollowsByFollowing.get(followingId)!.add(id);

    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const follow = Array.from(this.userFollows.values()).find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (!follow) return false;

    this.userFollows.delete(follow.id);

    // Update indexes
    this.userFollowsByFollower.get(followerId)?.delete(follow.id);
    this.userFollowsByFollowing.get(followingId)?.delete(follow.id);

    return true;
  }

  async getFollowers(userId: string): Promise<UserFollow[]> {
    const followIds = this.userFollowsByFollowing.get(userId) || new Set();
    return Array.from(followIds).map((id) => this.userFollows.get(id)!).filter(Boolean);
  }

  async getFollowing(userId: string): Promise<UserFollow[]> {
    const followIds = this.userFollowsByFollower.get(userId) || new Set();
    return Array.from(followIds).map((id) => this.userFollows.get(id)!).filter(Boolean);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.userFollows.values()).some(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
  }

  async getFollowStats(userId: string): Promise<{ followerCount: number; followingCount: number }> {
    const followerCount = this.userFollowsByFollowing.get(userId)?.size || 0;
    const followingCount = this.userFollowsByFollower.get(userId)?.size || 0;
    return { followerCount, followingCount };
  }

  // ============ LIKE OPERATIONS ============
  async likePhoto(userId: string, photoId: string): Promise<PhotoLike> {
    // Check for existing like
    const existing = Array.from(this.photoLikes.values()).find(
      (l) => l.userId === userId && l.dishPhotoId === photoId
    );
    if (existing) return existing;

    const id = randomUUID();
    const like: PhotoLike = {
      id,
      dishPhotoId: photoId,
      userId,
      createdAt: new Date(),
    };
    this.photoLikes.set(id, like);

    // Update indexes
    if (!this.photoLikesByPhoto.has(photoId)) {
      this.photoLikesByPhoto.set(photoId, new Set());
    }
    this.photoLikesByPhoto.get(photoId)!.add(id);

    if (!this.photoLikesByUser.has(userId)) {
      this.photoLikesByUser.set(userId, new Set());
    }
    this.photoLikesByUser.get(userId)!.add(id);

    return like;
  }

  async unlikePhoto(userId: string, photoId: string): Promise<boolean> {
    const like = Array.from(this.photoLikes.values()).find(
      (l) => l.userId === userId && l.dishPhotoId === photoId
    );
    if (!like) return false;

    this.photoLikes.delete(like.id);
    this.photoLikesByPhoto.get(photoId)?.delete(like.id);
    this.photoLikesByUser.get(userId)?.delete(like.id);

    return true;
  }

  async getPhotoLikes(photoId: string): Promise<PhotoLike[]> {
    const likeIds = this.photoLikesByPhoto.get(photoId) || new Set();
    return Array.from(likeIds).map((id) => this.photoLikes.get(id)!).filter(Boolean);
  }

  async getUserLikes(userId: string): Promise<PhotoLike[]> {
    const likeIds = this.photoLikesByUser.get(userId) || new Set();
    return Array.from(likeIds).map((id) => this.photoLikes.get(id)!).filter(Boolean);
  }

  async isPhotoLikedByUser(photoId: string, userId: string): Promise<boolean> {
    return Array.from(this.photoLikes.values()).some(
      (l) => l.dishPhotoId === photoId && l.userId === userId
    );
  }

  async getPhotoLikeCount(photoId: string): Promise<number> {
    return this.photoLikesByPhoto.get(photoId)?.size || 0;
  }

  // ============ DISH BOOKMARK OPERATIONS ============
  async bookmarkDish(userId: string, dishId: string): Promise<DishBookmark> {
    const existing = Array.from(this.dishBookmarks.values()).find(
      (b) => b.userId === userId && b.dishId === dishId
    );
    if (existing) return existing;

    const id = randomUUID();
    const bookmark: DishBookmark = {
      id,
      userId,
      dishId,
      createdAt: new Date(),
    };
    this.dishBookmarks.set(id, bookmark);

    if (!this.dishBookmarksByUser.has(userId)) {
      this.dishBookmarksByUser.set(userId, new Set());
    }
    this.dishBookmarksByUser.get(userId)!.add(id);

    return bookmark;
  }

  async unbookmarkDish(userId: string, dishId: string): Promise<boolean> {
    const bookmark = Array.from(this.dishBookmarks.values()).find(
      (b) => b.userId === userId && b.dishId === dishId
    );
    if (!bookmark) return false;

    this.dishBookmarks.delete(bookmark.id);
    this.dishBookmarksByUser.get(userId)?.delete(bookmark.id);

    return true;
  }

  async getUserDishBookmarks(userId: string): Promise<DishBookmark[]> {
    const bookmarkIds = this.dishBookmarksByUser.get(userId) || new Set();
    return Array.from(bookmarkIds).map((id) => this.dishBookmarks.get(id)!).filter(Boolean);
  }

  async isDishBookmarked(userId: string, dishId: string): Promise<boolean> {
    return Array.from(this.dishBookmarks.values()).some(
      (b) => b.userId === userId && b.dishId === dishId
    );
  }

  // ============ RESTAURANT BOOKMARK OPERATIONS ============
  async bookmarkRestaurant(userId: string, restaurantId: string): Promise<RestaurantBookmark> {
    const existing = Array.from(this.restaurantBookmarks.values()).find(
      (b) => b.userId === userId && b.restaurantId === restaurantId
    );
    if (existing) return existing;

    const id = randomUUID();
    const bookmark: RestaurantBookmark = {
      id,
      userId,
      restaurantId,
      createdAt: new Date(),
    };
    this.restaurantBookmarks.set(id, bookmark);

    if (!this.restaurantBookmarksByUser.has(userId)) {
      this.restaurantBookmarksByUser.set(userId, new Set());
    }
    this.restaurantBookmarksByUser.get(userId)!.add(id);

    return bookmark;
  }

  async unbookmarkRestaurant(userId: string, restaurantId: string): Promise<boolean> {
    const bookmark = Array.from(this.restaurantBookmarks.values()).find(
      (b) => b.userId === userId && b.restaurantId === restaurantId
    );
    if (!bookmark) return false;

    this.restaurantBookmarks.delete(bookmark.id);
    this.restaurantBookmarksByUser.get(userId)?.delete(bookmark.id);

    return true;
  }

  async getUserRestaurantBookmarks(userId: string): Promise<RestaurantBookmark[]> {
    const bookmarkIds = this.restaurantBookmarksByUser.get(userId) || new Set();
    return Array.from(bookmarkIds).map((id) => this.restaurantBookmarks.get(id)!).filter(Boolean);
  }

  async isRestaurantBookmarked(userId: string, restaurantId: string): Promise<boolean> {
    return Array.from(this.restaurantBookmarks.values()).some(
      (b) => b.userId === userId && b.restaurantId === restaurantId
    );
  }

  // ============ SHARE OPERATIONS ============
  async createShare(share: InsertShare): Promise<Share> {
    const id = randomUUID();
    const newShare: Share = {
      id,
      senderId: share.senderId,
      recipientId: share.recipientId,
      shareType: share.shareType,
      dishId: share.dishId ?? null,
      dishInstanceId: share.dishInstanceId ?? null,
      restaurantId: share.restaurantId ?? null,
      sharedUserId: share.sharedUserId ?? null,
      message: share.message ?? null,
      readAt: null,
      createdAt: new Date(),
    };
    this.shares.set(id, newShare);

    if (!this.sharesByRecipient.has(share.recipientId)) {
      this.sharesByRecipient.set(share.recipientId, []);
    }
    this.sharesByRecipient.get(share.recipientId)!.push(id);

    return newShare;
  }

  async getUserInbox(userId: string, unreadOnly = false): Promise<Share[]> {
    const shareIds = this.sharesByRecipient.get(userId) || [];
    const shares = shareIds.map((id) => this.shares.get(id)!).filter(Boolean);

    if (unreadOnly) {
      return shares.filter((s) => !s.readAt);
    }

    return shares.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async markShareAsRead(shareId: string): Promise<Share | undefined> {
    const share = this.shares.get(shareId);
    if (!share) return undefined;

    const updated = { ...share, readAt: new Date() };
    this.shares.set(shareId, updated);
    return updated;
  }

  async deleteShare(shareId: string): Promise<boolean> {
    const share = this.shares.get(shareId);
    if (!share) return false;

    this.shares.delete(shareId);

    const recipientShares = this.sharesByRecipient.get(share.recipientId);
    if (recipientShares) {
      const index = recipientShares.indexOf(shareId);
      if (index !== -1) {
        recipientShares.splice(index, 1);
      }
    }

    return true;
  }

  async getShareById(id: string): Promise<Share | undefined> {
    return this.shares.get(id);
  }

  // ============ AGGREGATION METHODS ============
  async getRestaurantWithDishes(restaurantId: string): Promise<any> {
    const restaurant = this.restaurants.get(restaurantId);
    if (!restaurant) return undefined;

    const allDishes = Array.from(this.dishes.values()).filter(
      (d) => d.restaurantId === restaurantId
    );

    const dishesWithPhotos = allDishes.map((dish) => {
      const photos = Array.from(this.dishPhotos.values()).filter(
        (p) => p.dishId === dish.id
      );

      // Get most liked photo
      let mostLikedPhoto: any = null;
      let maxLikes = -1;

      for (const photo of photos) {
        const likeCount = this.photoLikesByPhoto.get(photo.id)?.size || 0;
        if (likeCount > maxLikes || (!mostLikedPhoto && photos.length > 0)) {
          maxLikes = likeCount;
          mostLikedPhoto = { ...photo, likeCount };
        }
      }

      // If no photos have likes, just use the first photo
      if (!mostLikedPhoto && photos.length > 0) {
        mostLikedPhoto = { ...photos[0], likeCount: 0 };
      }

      return {
        ...dish,
        photoCount: photos.length,
        mostLikedPhoto,
      };
    });

    return {
      ...restaurant,
      dishes: dishesWithPhotos,
    };
  }

  async getDishPhotosWithDetails(dishId: string): Promise<DishPhotoWithDetails[]> {
    const photos = Array.from(this.dishPhotos.values()).filter(
      (p) => p.dishId === dishId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  async getUserProfileStats(userId: string): Promise<{
    photoCount: number;
    likeCount: number;
    followerCount: number;
    followingCount: number;
  }> {
    const photoCount = Array.from(this.dishPhotos.values()).filter(
      (p) => p.postedByUserId === userId
    ).length;

    const likeCount = this.photoLikesByUser.get(userId)?.size || 0;

    const stats = await this.getFollowStats(userId);

    return {
      photoCount,
      likeCount,
      ...stats,
    };
  }

  async getFeedPhotos(userId: string, limit = 20, offset = 0): Promise<DishPhotoWithDetails[]> {
    // Get users that this user follows
    const following = await this.getFollowing(userId);
    const followingIds = new Set(following.map(f => f.followingId));
    followingIds.add(userId); // Include user's own posts

    // Get all photos from followed users
    const feedPhotos = Array.from(this.dishPhotos.values())
      .filter((p) => p.postedByUserId && followingIds.has(p.postedByUserId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    // Enhance with details
    return feedPhotos.map((photo) => {
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

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values())
      .filter((u) =>
        u.username.toLowerCase().includes(lowerQuery) ||
        u.displayName?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  async searchDishes(query: string, limit = 20): Promise<Dish[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.dishes.values())
      .filter((d) => d.name.toLowerCase().includes(lowerQuery))
      .slice(0, limit);
  }

  async searchRestaurants(query: string, limit = 20): Promise<Restaurant[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.restaurants.values())
      .filter((r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.address?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
