import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RatingButtons, RatingBadge } from "@/components/RatingButtons";
import { Loader2, ArrowUpDown, Clock, Star, ImageOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { DishPhotoWithDetails, Rating } from "@shared/schema";

type SortMode = "recent" | "rating";

const ratingOrder: Record<string, number> = {
  "Elite": 0,
  "Would order again": 1,
  "Should try once": 2,
  "Not for me": 3,
};

export default function Dishes() {
  const queryClient = useQueryClient();
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [selectedPhoto, setSelectedPhoto] = useState<DishPhotoWithDetails | null>(null);

  const { data: photos = [], isLoading } = useQuery<DishPhotoWithDetails[]>({
    queryKey: ["/api/dish-photos"],
  });

  const updateRatingMutation = useMutation({
    mutationFn: async ({ instanceId, rating }: { instanceId: string; rating: Rating }) => {
      const res = await apiRequest("PATCH", `/api/dish-instances/${instanceId}`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos"] });
      if (selectedPhoto?.dishInstance) {
        setSelectedPhoto({
          ...selectedPhoto,
          dishInstance: {
            ...selectedPhoto.dishInstance,
            rating: selectedPhoto.dishInstance.rating,
          },
        });
      }
    },
  });

  const sortedPhotos = [...photos].sort((a, b) => {
    if (sortMode === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    const ratingA = a.dishInstance?.rating ? ratingOrder[a.dishInstance.rating] ?? 4 : 4;
    const ratingB = b.dishInstance?.rating ? ratingOrder[b.dishInstance.rating] ?? 4 : 4;
    if (ratingA !== ratingB) return ratingA - ratingB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleRatingChange = (rating: Rating) => {
    if (selectedPhoto?.dishInstance) {
      updateRatingMutation.mutate({ instanceId: selectedPhoto.dishInstance.id, rating });
      setSelectedPhoto({
        ...selectedPhoto,
        dishInstance: {
          ...selectedPhoto.dishInstance,
          rating,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 p-3 bg-background border-b border-border">
          <h1 className="text-lg font-semibold">My Dishes</h1>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No dishes yet</h2>
          <p className="text-muted-foreground max-w-xs">
            Start by capturing photos of your favorite dishes from the Capture tab
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 p-3 bg-background border-b border-border">
        <h1 className="text-lg font-semibold">My Dishes</h1>
        <div className="flex gap-1">
          <Button
            variant={sortMode === "recent" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortMode("recent")}
            data-testid="sort-recent"
            className="gap-1"
          >
            <Clock className="w-4 h-4" />
            Recent
          </Button>
          <Button
            variant={sortMode === "rating" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortMode("rating")}
            data-testid="sort-rating"
            className="gap-1"
          >
            <Star className="w-4 h-4" />
            Rating
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
          {sortedPhotos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              data-testid={`dish-photo-${photo.id}`}
              className="relative aspect-square overflow-hidden bg-muted"
            >
              <img
                src={photo.imageUrl}
                alt={photo.dishInstance?.dish?.name || "Dish"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <RatingBadge rating={photo.dishInstance?.rating} />
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedPhoto && (
            <>
              <div className="aspect-[4/3] bg-black">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.dishInstance?.dish?.name || "Dish"}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedPhoto.dishInstance?.dish?.name || "Unlinked Photo"}
                  </h3>
                  {selectedPhoto.dishInstance?.receipt?.restaurant && (
                    <p className="text-muted-foreground">
                      {selectedPhoto.dishInstance.receipt.restaurant.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedPhoto.dishInstance?.receipt?.datetime && (
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span>{new Date(selectedPhoto.dishInstance.receipt.datetime).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedPhoto.dishInstance?.price && (
                    <div>
                      <span className="text-muted-foreground">Price: </span>
                      <span>${parseFloat(selectedPhoto.dishInstance.price).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {selectedPhoto.dishInstance && (
                  <div>
                    <p className="text-sm font-medium mb-2">Rating</p>
                    <RatingButtons
                      value={selectedPhoto.dishInstance.rating}
                      onChange={handleRatingChange}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
