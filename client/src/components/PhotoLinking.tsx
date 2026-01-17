import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Link, X, Plus, Upload, Camera } from "lucide-react";
import type { DishInstance, Dish, DishPhoto } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface DishInstanceWithDish extends DishInstance {
  dish: Dish;
}

interface PhotoLinkingProps {
  dishInstances: DishInstanceWithDish[];
  unlinkedPhotos: DishPhoto[];
  onLink: (photoId: string, dishInstanceId: string) => void;
  onUpload: (images: string[], dishInstanceId?: string) => Promise<DishPhoto[]>;
  onComplete: () => void;
  onSkip?: () => void;
}

export function PhotoLinking({
  dishInstances,
  unlinkedPhotos,
  onLink,
  onUpload,
  onComplete,
  onSkip,
}: PhotoLinkingProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [linkedPairs, setLinkedPairs] = useState<Record<string, string>>({});
  const [uploadedLinkedPhotos, setUploadedLinkedPhotos] = useState<DishPhoto[]>([]);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const specificDishInputRef = useRef<HTMLInputElement>(null);
  const selectedDishForUpload = useRef<string | null>(null);

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
    // Check manually linked pairs (from unlinked pool)
    const linkedId = Object.entries(linkedPairs).find(([_, diId]) => diId === dishInstanceId)?.[0];
    if (linkedId) {
      return unlinkedPhotos.find((p) => p.id === linkedId);
    }
    // Check directly uploaded linked photos
    const uploaded = uploadedLinkedPhotos.find(p => p.dishInstanceId === dishInstanceId);
    if (uploaded) return uploaded;

    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, dishInstanceId?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const imagePromises = Array.from(files).map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      });

      const images = await Promise.all(imagePromises);
      const uploadedPhotos = await onUpload(images, dishInstanceId);

      if (dishInstanceId && uploadedPhotos.length > 0) {
        setUploadedLinkedPhotos(prev => [...prev, ...uploadedPhotos]);
      }

      toast({
        title: "Photos uploaded",
        description: `Successfully uploaded ${images.length} photo${images.length > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const triggerDishUpload = (dishInstanceId: string) => {
    selectedDishForUpload.current = dishInstanceId;
    specificDishInputRef.current?.click();
  };

  const availablePhotos = unlinkedPhotos.filter((p) => !linkedPairs[p.id]);
  const hasUnlinkedPhotos = availablePhotos.length > 0;

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => handleFileUpload(e)}
        data-testid="input-upload-pool"
      />
      <input
        type="file"
        ref={specificDishInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => selectedDishForUpload.current && handleFileUpload(e, selectedDishForUpload.current)}
        data-testid="input-upload-dish"
      />

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
                <div
                  key={di.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedPhoto && !isLinked
                      ? "border-primary bg-primary/5 cursor-pointer"
                      : isLinked
                      ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                      : "border-border"
                  }`}
                  onClick={() => !isLinked && selectedPhoto && handleDishSelect(di.id)}
                  data-testid={`dish-instance-${di.id}`}
                >
                  {linkedPhoto ? (
                    <img
                      src={linkedPhoto.imageUrl}
                      alt={di.dish.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // If we have a selected photo, linking takes precedence over uploading
                        if (selectedPhoto) {
                          handleDishSelect(di.id);
                        } else {
                          triggerDishUpload(di.id);
                        }
                      }}
                      className={`w-12 h-12 rounded flex items-center justify-center transition-colors ${
                        selectedPhoto
                          ? "bg-primary/20 hover:bg-primary/30"
                          : "bg-muted hover:bg-muted/80 cursor-pointer"
                      }`}
                      title={selectedPhoto ? "Click to link selected photo" : "Click to upload photo for this dish"}
                    >
                      {selectedPhoto ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Camera className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
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
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Unlinked Photos ({availablePhotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/10 transition-colors"
                data-testid="button-add-photos"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-medium">Add Photos</span>
              </button>

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
