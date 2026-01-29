import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin } from "lucide-react";
import { useState } from "react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { DishDetailModal } from "@/components/DishDetailModal";

interface RestaurantWithDishes {
  id: string;
  name: string;
  address: string | null;
  dishes: Array<{
    id: string;
    name: string;
    photoCount: number;
    mostLikedPhoto?: {
      id: string;
      imageUrl: string;
      likeCount: number;
    };
  }>;
}

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  const { data: restaurant, isLoading } = useQuery<RestaurantWithDishes>({
    queryKey: ["/api/restaurants", id, "dishes"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-muted-foreground">Restaurant not found</p>
        <Button variant="outline" onClick={() => navigate("/search")}>
          Back to search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-background border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{restaurant.name}</h1>
          {restaurant.address && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{restaurant.address}</span>
            </div>
          )}
        </div>
        <BookmarkButton type="restaurant" itemId={id!} />
      </div>

      {/* Instagram-style grid */}
      <div className="flex-1 overflow-auto pb-20">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
          {restaurant.dishes.map((dish) => {
            if (!dish.mostLikedPhoto) return null;

            return (
              <button
                key={dish.id}
                onClick={() => setSelectedDishId(dish.id)}
                className="relative aspect-square overflow-hidden bg-muted group"
              >
                <img
                  src={dish.mostLikedPhoto.imageUrl}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay on hover showing dish name and photo count */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                  <p className="text-sm font-medium text-center line-clamp-2">
                    {dish.name}
                  </p>
                  {dish.photoCount > 1 && (
                    <p className="text-xs mt-1">{dish.photoCount} photos</p>
                  )}
                  {dish.mostLikedPhoto.likeCount > 0 && (
                    <p className="text-xs">{dish.mostLikedPhoto.likeCount} likes</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {restaurant.dishes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No dishes yet for this restaurant</p>
          </div>
        )}
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
