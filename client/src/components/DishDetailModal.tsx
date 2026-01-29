import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { DishPhotoWithDetails } from "@shared/schema";
import { LikeButton } from "./LikeButton";
import { BookmarkButton } from "./BookmarkButton";

interface DishDetailModalProps {
  dishId: string;
  open: boolean;
  onClose: () => void;
}

export function DishDetailModal({ dishId, open, onClose }: DishDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: photos = [], isLoading } = useQuery<DishPhotoWithDetails[]>({
    queryKey: ["/api/dishes", dishId, "photos"],
    enabled: open && !!dishId,
  });

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">No photos available</p>
          </div>
        ) : (
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Photo carousel */}
            <div className="relative aspect-[4/3] bg-black">
              <img
                src={currentPhoto.imageUrl}
                alt={currentPhoto.dishInstance?.dish.name || "Dish"}
                className="w-full h-full object-contain"
              />

              {/* Navigation arrows (only if multiple photos) */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  {/* Photo counter */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>

            {/* Photo details */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-xl font-semibold">
                  {currentPhoto.dishInstance?.dish.name || "Unlinked Photo"}
                </h3>
                {currentPhoto.dishInstance?.receipt?.restaurant && (
                  <p className="text-muted-foreground">
                    {currentPhoto.dishInstance.receipt.restaurant.name}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {currentPhoto.dishInstance?.receipt?.datetime && (
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span>
                      {new Date(currentPhoto.dishInstance.receipt.datetime).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {currentPhoto.dishInstance?.price && (
                  <div>
                    <span className="text-muted-foreground">Price: </span>
                    <span>${parseFloat(currentPhoto.dishInstance.price).toFixed(2)}</span>
                  </div>
                )}
                {currentPhoto.dishInstance?.rating && (
                  <div>
                    <span className="text-muted-foreground">Rating: </span>
                    <span>{currentPhoto.dishInstance.rating}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <LikeButton photoId={currentPhoto.id} />
                {currentPhoto.dishInstance?.dish && (
                  <BookmarkButton
                    type="dish"
                    itemId={currentPhoto.dishInstance.dish.id}
                    showLabel
                  />
                )}
              </div>

              {/* Thumbnail strip (if multiple photos) */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pt-2">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                        index === currentIndex
                          ? "border-primary"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={photo.imageUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
