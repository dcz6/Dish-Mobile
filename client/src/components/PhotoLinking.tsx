import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Link, X } from "lucide-react";
import type { DishInstance, Dish, DishPhoto } from "@shared/schema";

interface DishInstanceWithDish extends DishInstance {
  dish: Dish;
}

interface PhotoLinkingProps {
  dishInstances: DishInstanceWithDish[];
  unlinkedPhotos: DishPhoto[];
  onLink: (photoId: string, dishInstanceId: string) => void;
  onComplete: () => void;
  onSkip?: () => void;
}

export function PhotoLinking({
  dishInstances,
  unlinkedPhotos,
  onLink,
  onComplete,
  onSkip,
}: PhotoLinkingProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [linkedPairs, setLinkedPairs] = useState<Record<string, string>>({});

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhoto(selectedPhoto === photoId ? null : photoId);
  };

  const handleDishSelect = (dishInstanceId: string) => {
    if (selectedPhoto) {
      onLink(selectedPhoto, dishInstanceId);
      setLinkedPairs((prev) => ({ ...prev, [selectedPhoto]: dishInstanceId }));
      setSelectedPhoto(null);
    }
  };

  const getLinkedPhoto = (dishInstanceId: string) => {
    const photoId = Object.entries(linkedPairs).find(([_, diId]) => diId === dishInstanceId)?.[0];
    if (photoId) {
      return unlinkedPhotos.find((p) => p.id === photoId);
    }
    return null;
  };

  const availablePhotos = unlinkedPhotos.filter((p) => !linkedPairs[p.id]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 pb-32">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Link Photos to Dishes</h2>
          <p className="text-muted-foreground text-sm">
            Match your dish photos with the items from your receipt
          </p>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dishes from Receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dishInstances.map((di) => {
              const linkedPhoto = getLinkedPhoto(di.id);
              const isLinked = !!linkedPhoto;

              return (
                <button
                  key={di.id}
                  onClick={() => !isLinked && handleDishSelect(di.id)}
                  disabled={!selectedPhoto && !isLinked}
                  data-testid={`dish-instance-${di.id}`}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedPhoto && !isLinked
                      ? "border-primary bg-primary/5 cursor-pointer"
                      : isLinked
                      ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                      : "border-border opacity-60"
                  }`}
                >
                  {linkedPhoto ? (
                    <img
                      src={linkedPhoto.imageUrl}
                      alt={di.dish.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Link className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{di.dish.name}</div>
                    {di.price && (
                      <div className="text-sm text-muted-foreground">
                        ${parseFloat(di.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                  {isLinked && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {availablePhotos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Unlinked Photos ({availablePhotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {availablePhotos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handlePhotoSelect(photo.id)}
                    data-testid={`unlinked-photo-${photo.id}`}
                    className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedPhoto === photo.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={photo.imageUrl}
                      alt="Dish"
                      className="w-full h-full object-cover"
                    />
                    {selectedPhoto === photo.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedPhoto && (
                <p className="text-sm text-primary mt-3 text-center">
                  Now tap a dish above to link this photo
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
              data-testid="button-skip-linking"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Skip
            </Button>
          )}
          <Button
            onClick={onComplete}
            data-testid="button-done-linking"
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
