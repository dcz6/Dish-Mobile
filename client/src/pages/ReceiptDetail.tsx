import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingButtons, RatingBadge } from "@/components/RatingButtons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  Image,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ReceiptWithDetails, DishPhoto, Rating } from "@shared/schema";
import { useState } from "react";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingInstanceId, setLinkingInstanceId] = useState<string | null>(null);

  const { data: receipt, isLoading } = useQuery<ReceiptWithDetails>({
    queryKey: ["/api/receipts", id],
    enabled: !!id,
  });

  const { data: unlinkedPhotos = [] } = useQuery<DishPhoto[]>({
    queryKey: ["/api/dish-photos/unlinked"],
    enabled: showLinkDialog,
  });

  const updateRatingMutation = useMutation({
    mutationFn: async ({ instanceId, rating }: { instanceId: string; rating: Rating }) => {
      const res = await apiRequest("PATCH", `/api/dish-instances/${instanceId}`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts", id] });
      setSelectedInstanceId(null);
    },
  });

  const linkPhotoMutation = useMutation({
    mutationFn: async ({ photoId, dishInstanceId }: { photoId: string; dishInstanceId: string }) => {
      const res = await apiRequest("PATCH", `/api/dish-photos/${photoId}`, { dishInstanceId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos/unlinked"] });
      setShowLinkDialog(false);
      setLinkingInstanceId(null);
    },
  });

  const handleLinkPhoto = (photoId: string) => {
    if (linkingInstanceId) {
      linkPhotoMutation.mutate({ photoId, dishInstanceId: linkingInstanceId });
    }
  };

  const openLinkDialog = (instanceId: string) => {
    setLinkingInstanceId(instanceId);
    setShowLinkDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-muted-foreground">Receipt not found</p>
        <Button variant="outline" onClick={() => navigate("/receipts")}>
          Back to receipts
        </Button>
      </div>
    );
  }

  const selectedInstance = receipt.dishInstances.find((di) => di.id === selectedInstanceId);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-background border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/receipts")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{receipt.restaurant.name}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20">
        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {receipt.restaurant.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span>{receipt.restaurant.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(receipt.datetime).toLocaleString()}</span>
              </div>
              {receipt.totalAmount && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>Total: ${parseFloat(receipt.totalAmount).toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Items Ordered</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {receipt.dishInstances.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No items recorded for this visit
                </p>
              ) : (
                receipt.dishInstances.map((di) => (
                  <div
                    key={di.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border"
                    data-testid={`dish-instance-${di.id}`}
                  >
                    {di.photo ? (
                      <button
                        onClick={() => setSelectedInstanceId(di.id)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                      >
                        <img
                          src={di.photo.imageUrl}
                          alt={di.dish.name}
                          className="w-full h-full object-cover"
                        />
                        <RatingBadge rating={di.rating} />
                      </button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-16 h-16 rounded-lg flex-shrink-0"
                        onClick={() => openLinkDialog(di.id)}
                        data-testid={`link-photo-${di.id}`}
                      >
                        <LinkIcon className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{di.dish.name}</div>
                      {di.price && (
                        <div className="text-sm text-muted-foreground">
                          ${parseFloat(di.price).toFixed(2)}
                        </div>
                      )}
                      {di.rating && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {di.rating}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInstanceId(di.id)}
                      data-testid={`rate-dish-${di.id}`}
                    >
                      Rate
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedInstanceId} onOpenChange={() => setSelectedInstanceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {selectedInstance?.dish.name}</DialogTitle>
          </DialogHeader>
          <RatingButtons
            value={selectedInstance?.rating}
            onChange={(rating) => {
              if (selectedInstanceId) {
                updateRatingMutation.mutate({ instanceId: selectedInstanceId, rating });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link a Photo</DialogTitle>
          </DialogHeader>
          {unlinkedPhotos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No unlinked photos available. Take a dish photo first!
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {unlinkedPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => handleLinkPhoto(photo.id)}
                  data-testid={`select-photo-${photo.id}`}
                  className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                >
                  <img
                    src={photo.imageUrl}
                    alt="Dish"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
