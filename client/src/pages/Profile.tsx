import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings, Bookmark as BookmarkIcon } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { TEST_USER_ID } from "@shared/schema";
import type { User, DishPhoto, DishBookmark, RestaurantBookmark } from "@shared/schema";
import { useState } from "react";
import { DishDetailModal } from "@/components/DishDetailModal";

interface UserStats {
  photoCount: number;
  likeCount: number;
  followerCount: number;
  followingCount: number;
}

export default function Profile() {
  const { userId = TEST_USER_ID } = useParams<{ userId?: string }>();
  const [, navigate] = useLocation();
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  const isOwnProfile = userId === TEST_USER_ID;

  const { data: user, isLoading: loadingUser } = useQuery<User>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: stats, isLoading: loadingStats } = useQuery<UserStats>({
    queryKey: ["/api/users", userId, "profile-stats"],
    enabled: !!userId,
  });

  const { data: photos = [], isLoading: loadingPhotos } = useQuery<DishPhoto[]>({
    queryKey: ["/api/dish-photos"],
    select: (allPhotos: any[]) => allPhotos.filter((p: any) => p.postedByUserId === userId),
    enabled: !!userId,
  });

  const { data: dishBookmarks = [], isLoading: loadingDishBookmarks } = useQuery<DishBookmark[]>({
    queryKey: ["/api/users", userId, "bookmarks", "dishes"],
    enabled: isOwnProfile,
  });

  const { data: restaurantBookmarks = [], isLoading: loadingRestaurantBookmarks } = useQuery<RestaurantBookmark[]>({
    queryKey: ["/api/users", userId, "bookmarks", "restaurants"],
    enabled: isOwnProfile,
  });

  const isLoading = loadingUser || loadingStats || loadingPhotos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => navigate("/feed")}>
          Back to feed
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-4 bg-background border-b border-border">
        <h1 className="text-lg font-semibold flex-1">{user.username}</h1>
        {isOwnProfile && (
          <Button variant="ghost" size="icon" onClick={() => navigate("/receipts")}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto pb-20">
        {/* Profile info */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="text-2xl">
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-bold">
                {user.displayName || user.username}
              </h2>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-xl font-bold">{stats.photoCount}</div>
              <div className="text-sm text-muted-foreground">Photos</div>
            </div>
            <button
              onClick={() => navigate(`/users/${userId}/followers`)}
              className="text-center hover:text-primary transition-colors"
            >
              <div className="text-xl font-bold">{stats.followerCount}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </button>
            <button
              onClick={() => navigate(`/users/${userId}/following`)}
              className="text-center hover:text-primary transition-colors"
            >
              <div className="text-xl font-bold">{stats.followingCount}</div>
              <div className="text-sm text-muted-foreground">Following</div>
            </button>
          </div>

          {/* Follow button */}
          {!isOwnProfile && (
            <FollowButton userId={userId!} variant="default" size="default" className="w-full" />
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dishes" className="flex flex-col">
          <TabsList className="mx-4">
            <TabsTrigger value="dishes" className="flex-1">
              Dishes
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="saved" className="flex-1">
                Saved
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dishes" className="mt-0">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    className="relative aspect-square overflow-hidden bg-muted"
                    onClick={() => photo.dishId && setSelectedDishId(photo.dishId)}
                  >
                    <img
                      src={photo.imageUrl}
                      alt="Dish photo"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="saved" className="mt-0">
              <div className="p-4 space-y-6">
                {/* Saved dishes */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Saved Dishes</h3>
                  {loadingDishBookmarks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : dishBookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BookmarkIcon className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No saved dishes yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                      {dishBookmarks.map((bookmark) => (
                        <button
                          key={bookmark.id}
                          onClick={() => setSelectedDishId(bookmark.dishId)}
                          className="relative aspect-square overflow-hidden bg-muted flex items-center justify-center"
                        >
                          <BookmarkIcon className="w-8 h-8 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Saved restaurants */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Saved Restaurants</h3>
                  {loadingRestaurantBookmarks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : restaurantBookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BookmarkIcon className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No saved restaurants yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {restaurantBookmarks.map((bookmark) => (
                        <button
                          key={bookmark.id}
                          onClick={() => navigate(`/restaurants/${bookmark.restaurantId}`)}
                          className="w-full p-4 text-left hover:bg-muted transition-colors"
                        >
                          <p className="font-medium">Restaurant {bookmark.restaurantId.substring(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Saved {new Date(bookmark.createdAt).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dish detail modal */}
      {selectedDishId && (
        <DishDetailModal
          dishId={selectedDishId}
          open={!!selectedDishId}
          onClose={() => setSelectedDishId(null)}
        />
      )}
    </div>
  );
}
