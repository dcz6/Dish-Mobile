import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TEST_USER_ID } from "@shared/schema";
import type { DishPhotoWithDetails } from "@shared/schema";
import { LikeButton } from "@/components/LikeButton";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useState } from "react";
import { DishDetailModal } from "@/components/DishDetailModal";

export default function Feed() {
  const [, navigate] = useLocation();
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  const { data: feedPhotos = [], isLoading } = useQuery<DishPhotoWithDetails[]>({
    queryKey: ["/api/users", TEST_USER_ID, "feed"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${TEST_USER_ID}/feed?limit=50`);
      if (!response.ok) throw new Error("Failed to fetch feed");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (feedPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-semibold">Welcome to Dish!</h2>
          <p className="text-muted-foreground">
            Follow other users to see their dish photos here. Start by searching for users or
            exploring restaurants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 bg-background border-b border-border">
        <h1 className="text-lg font-semibold">Feed</h1>
      </div>

      {/* Feed content */}
      <div className="flex-1 overflow-auto pb-20">
        <div className="max-w-2xl mx-auto">
          {feedPhotos.map((photo) => (
            <div key={photo.id} className="border-b border-border">
              {/* User header */}
              <div className="flex items-center gap-3 p-4">
                <Avatar
                  className="w-10 h-10 cursor-pointer"
                  onClick={() => navigate(`/profile/${photo.postedByUserId}`)}
                >
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {photo.postedByUserId?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(`/profile/${photo.postedByUserId}`)}
                  >
                    User {photo.postedByUserId?.substring(0, 8)}
                  </p>
                  {photo.dishInstance?.receipt?.restaurant && (
                    <p className="text-sm text-muted-foreground">
                      {photo.dishInstance.receipt.restaurant.name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(photo.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Photo */}
              <div
                className="relative w-full aspect-square bg-muted cursor-pointer"
                onClick={() =>
                  photo.dishInstance?.dish.id && setSelectedDishId(photo.dishInstance.dish.id)
                }
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.dishInstance?.dish.name || "Dish"}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Actions and info */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <LikeButton photoId={photo.id} showCount />
                  {photo.dishInstance?.dish && (
                    <BookmarkButton
                      type="dish"
                      itemId={photo.dishInstance.dish.id}
                      size="icon"
                      variant="ghost"
                    />
                  )}
                </div>

                {photo.dishInstance?.dish && (
                  <div>
                    <p className="font-semibold">{photo.dishInstance.dish.name}</p>
                    {photo.dishInstance.price && (
                      <p className="text-sm text-muted-foreground">
                        ${parseFloat(photo.dishInstance.price).toFixed(2)}
                      </p>
                    )}
                    {photo.dishInstance.rating && (
                      <p className="text-sm text-muted-foreground">{photo.dishInstance.rating}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
