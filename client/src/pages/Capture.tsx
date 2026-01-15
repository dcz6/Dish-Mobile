import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ReceiptReview } from "@/components/ReceiptReview";
import { PhotoLinking } from "@/components/PhotoLinking";
import { RatingButtons } from "@/components/RatingButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UtensilsCrossed, Receipt } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ParsedReceipt, DishPhoto, DishInstance, Dish, ReceiptWithDetails, Rating, Receipt as ReceiptType } from "@shared/schema";

type CaptureMode = "dish" | "receipt";
type CaptureStep = "capture" | "parsing" | "review" | "linking" | "rating" | "done";

interface DishInstanceWithDish extends DishInstance {
  dish: Dish;
}

interface SavedReceiptResponse {
  receipt: ReceiptType;
  dishInstances: DishInstanceWithDish[];
}

export default function Capture() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CaptureMode>("dish");
  const [step, setStep] = useState<CaptureStep>("capture");
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [savedReceiptData, setSavedReceiptData] = useState<SavedReceiptResponse | null>(null);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
  const [linkedInstanceId, setLinkedInstanceId] = useState<string | null>(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const { data: unlinkedPhotos = [] } = useQuery<DishPhoto[]>({
    queryKey: ["/api/dish-photos/unlinked"],
    enabled: step === "linking",
  });

  const { data: allReceipts = [] } = useQuery<ReceiptWithDetails[]>({
    queryKey: ["/api/receipts"],
    enabled: showSaveOptions,
  });

  const recentReceipts = allReceipts.slice(0, 5);

  const parseReceiptMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await apiRequest("POST", "/api/parse-receipt", { image: imageData });
      return res.json() as Promise<ParsedReceipt>;
    },
    onSuccess: (data) => {
      setParsedReceipt(data);
      setStep("review");
    },
    onError: () => {
      setParsedReceipt({
        restaurantName: "",
        datetime: new Date().toISOString(),
        total: null,
        lineItems: [],
      });
      setStep("review");
    },
  });

  const saveDishPhotoMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; dishInstanceId?: string }) => {
      const res = await apiRequest("POST", "/api/dish-photos", data);
      return res.json() as Promise<DishPhoto>;
    },
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos/unlinked"] });
      setCurrentPhotoId(photo.id);
      if (!photo.dishInstanceId) {
        setShowSaveOptions(true);
      }
    },
  });

  const saveReceiptMutation = useMutation({
    mutationFn: async (data: ParsedReceipt) => {
      const res = await apiRequest("POST", "/api/receipts", data);
      return res.json() as Promise<SavedReceiptResponse>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dishes"] });
      setSavedReceiptData(data);
      setStep("linking");
    },
  });

  const linkPhotoMutation = useMutation({
    mutationFn: async ({ photoId, dishInstanceId }: { photoId: string; dishInstanceId: string }) => {
      const res = await apiRequest("PATCH", `/api/dish-photos/${photoId}`, { dishInstanceId });
      return res.json();
    },
    onSuccess: (_, { dishInstanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos"] });
      setLinkedInstanceId(dishInstanceId);
    },
  });

  const rateInstanceMutation = useMutation({
    mutationFn: async ({ instanceId, rating }: { instanceId: string; rating: Rating }) => {
      const res = await apiRequest("PATCH", `/api/dish-instances/${instanceId}`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dish-instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos"] });
    },
  });

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    if (mode === "receipt") {
      setStep("parsing");
      parseReceiptMutation.mutate(imageData);
    } else {
      saveDishPhotoMutation.mutate({ imageUrl: imageData });
    }
  };

  const handleReceiptConfirm = (data: ParsedReceipt) => {
    saveReceiptMutation.mutate(data);
  };

  const handleLinkPhoto = (photoId: string, dishInstanceId: string) => {
    linkPhotoMutation.mutate({ photoId, dishInstanceId });
  };

  const handleLinkingComplete = () => {
    if (linkedInstanceId) {
      setStep("rating");
    } else {
      handleReset();
    }
  };

  const handleRatingSelect = (rating: Rating) => {
    if (linkedInstanceId) {
      rateInstanceMutation.mutate({ instanceId: linkedInstanceId, rating });
    }
    handleReset();
  };

  const handleReset = () => {
    setStep("capture");
    setParsedReceipt(null);
    setSavedReceiptData(null);
    setCurrentPhotoId(null);
    setLinkedInstanceId(null);
    setCapturedImage(null);
    setShowSaveOptions(false);
  };

  const handleSaveToLinkLater = () => {
    setShowSaveOptions(false);
    setCapturedImage(null);
    handleReset();
  };

  if (step === "parsing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Analyzing receipt...</p>
      </div>
    );
  }

  if (step === "review" && parsedReceipt) {
    return (
      <ReceiptReview
        data={parsedReceipt}
        onConfirm={handleReceiptConfirm}
        onCancel={handleReset}
        isSubmitting={saveReceiptMutation.isPending}
      />
    );
  }

  if (step === "linking" && savedReceiptData) {
    return (
      <PhotoLinking
        dishInstances={savedReceiptData.dishInstances}
        unlinkedPhotos={unlinkedPhotos}
        onLink={handleLinkPhoto}
        onComplete={handleLinkingComplete}
        onSkip={handleReset}
      />
    );
  }

  if (step === "rating" && linkedInstanceId) {
    const linkedInstance = savedReceiptData?.dishInstances.find((di) => di.id === linkedInstanceId);
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-center mb-2">
              How was it?
            </h2>
            {linkedInstance && (
              <p className="text-muted-foreground text-center mb-6">
                Rate your {linkedInstance.dish.name}
              </p>
            )}
            <RatingButtons onChange={handleRatingSelect} />
            <Button
              variant="ghost"
              onClick={handleReset}
              className="w-full mt-4"
              data-testid="button-skip-rating"
            >
              Skip rating
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-2 p-4 bg-background/80 backdrop-blur-sm border-b border-border">
        <Button
          variant={mode === "dish" ? "default" : "outline"}
          onClick={() => setMode("dish")}
          data-testid="mode-dish"
          className="flex-1 max-w-32 gap-2"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Dish
        </Button>
        <Button
          variant={mode === "receipt" ? "default" : "outline"}
          onClick={() => setMode("receipt")}
          data-testid="mode-receipt"
          className="flex-1 max-w-32 gap-2"
        >
          <Receipt className="w-4 h-4" />
          Receipt
        </Button>
      </div>

      <div className="flex-1">
        <PhotoUpload
          mode={mode}
          onCapture={handleCapture}
        />
      </div>

      <Dialog open={showSaveOptions} onOpenChange={setShowSaveOptions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Photo Saved</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Your dish photo has been saved. You can link it to a receipt now or later.
            </p>
            {recentReceipts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Link to recent visit:</p>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {recentReceipts.map((receipt) => (
                    <Button
                      key={receipt.id}
                      variant="outline"
                      className="w-full justify-start text-left"
                      onClick={() => navigate(`/receipts/${receipt.id}`)}
                      data-testid={`link-to-receipt-${receipt.id}`}
                    >
                      {receipt.restaurant.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSaveToLinkLater}
              data-testid="button-link-later"
            >
              Link later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
