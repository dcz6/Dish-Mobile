import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, X, Check, RotateCcw, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

interface PhotoUploadProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
  mode: "dish" | "receipt";
}

export function PhotoUpload({ onCapture, onCancel, mode }: PhotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [multiPreviews, setMultiPreviews] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkCameraPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return true;
    }

    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (result.state === "denied") {
          setPermissionError("Camera access was denied. Please enable camera permissions in your browser or device settings.");
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPermissionError(null);
    setIsLoading(true);

    if (files.length === 1) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setPreview(imageData);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to read the image file. Please try again.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(files[0]);
    } else {
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

      Promise.all(imagePromises)
        .then((images) => {
          setMultiPreviews(images);
          setCurrentPreviewIndex(0);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          toast({
            title: "Error",
            description: "Failed to read some image files. Please try again.",
            variant: "destructive",
          });
        });
    }
  };

  const handleCameraCapture = async () => {
    setPermissionError(null);
    
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      return;
    }
    
    cameraInputRef.current?.click();
  };

  const handleGalleryUpload = () => {
    setPermissionError(null);
    galleryInputRef.current?.click();
  };

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  const handleMultiConfirm = () => {
    if (multiPreviews.length > 0) {
      multiPreviews.forEach((imageData) => {
        onCapture(imageData);
      });
      setMultiPreviews([]);
      setCurrentPreviewIndex(0);
    }
  };

  const handleRemoveCurrentPreview = () => {
    const newPreviews = multiPreviews.filter((_, i) => i !== currentPreviewIndex);
    if (newPreviews.length === 0) {
      setMultiPreviews([]);
      setCurrentPreviewIndex(0);
    } else {
      setMultiPreviews(newPreviews);
      setCurrentPreviewIndex(Math.min(currentPreviewIndex, newPreviews.length - 1));
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setMultiPreviews([]);
    setCurrentPreviewIndex(0);
    setPermissionError(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setMultiPreviews([]);
    setCurrentPreviewIndex(0);
    setPermissionError(null);
    onCancel?.();
  };

  const handleSwipe = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      if (currentPreviewIndex < multiPreviews.length - 1) {
        setCurrentPreviewIndex((i) => i + 1);
      }
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      if (currentPreviewIndex > 0) {
        setCurrentPreviewIndex((i) => i - 1);
      }
    }
  };

  if (preview) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex-1 relative flex items-center justify-center p-4">
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
        <div className="flex items-center justify-center gap-6 p-6 pb-8 bg-black/80">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRetake}
            data-testid="button-retake"
            className="rounded-full px-8"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Retake
          </Button>
          <Button
            size="lg"
            onClick={handleConfirm}
            data-testid="button-use-photo"
            className="rounded-full px-8"
          >
            <Check className="w-5 h-5 mr-2" />
            Use Photo
          </Button>
        </div>
      </div>
    );
  }

  if (multiPreviews.length > 0) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex items-center justify-between gap-2 p-4 bg-black/80" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemoveCurrentPreview}
              data-testid="button-remove-photo"
              className="text-white hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm">
              {currentPreviewIndex + 1} of {multiPreviews.length}
            </span>
          </div>
          <Button
            size="default"
            onClick={handleMultiConfirm}
            data-testid="button-use-all-photos"
            className="rounded-full"
          >
            <Check className="w-4 h-4 mr-2" />
            Use All ({multiPreviews.length})
          </Button>
        </div>
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {multiPreviews.length > 1 && currentPreviewIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPreviewIndex((i) => i - 1)}
              data-testid="button-prev-photo"
              className="absolute left-2 text-white z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPreviewIndex}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.5 }}
              transition={{ duration: 0.15 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleSwipe}
              className="flex items-center justify-center w-full h-full p-4 cursor-grab active:cursor-grabbing touch-pan-y"
            >
              <img
                src={multiPreviews[currentPreviewIndex]}
                alt={`Preview ${currentPreviewIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg pointer-events-none select-none"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
          {multiPreviews.length > 1 && currentPreviewIndex < multiPreviews.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPreviewIndex((i) => i + 1)}
              data-testid="button-next-photo"
              className="absolute right-2 text-white z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-2">
          {multiPreviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPreviewIndex(index)}
              data-testid={`thumbnail-indicator-${index}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentPreviewIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-center p-4 pb-6">
          <Button
            variant="outline"
            onClick={handleRetake}
            data-testid="button-retake-all"
            className="rounded-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-camera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-gallery"
      />
      
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold mb-2">
          {mode === "dish" ? "Capture Dish Photo" : "Capture Receipt"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {mode === "dish"
            ? "Take a photo of your dish"
            : "Take a photo of your receipt for automatic parsing"}
        </p>
      </div>

      {permissionError && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-xs text-sm">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-destructive font-medium mb-1">Camera Access Required</p>
            <p className="text-muted-foreground">{permissionError}</p>
          </div>
        </div>
      )}

      <Button
        size="lg"
        onClick={handleCameraCapture}
        disabled={isLoading}
        data-testid="button-open-camera"
        className="rounded-full h-24 w-24 relative"
      >
        {isLoading ? (
          <div className="animate-spin w-8 h-8 border-2 border-primary-foreground border-t-transparent rounded-full" />
        ) : (
          <Camera className="w-10 h-10" />
        )}
      </Button>
      
      <p className="text-muted-foreground text-center text-sm">
        Tap to open camera
      </p>

      <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 w-full max-w-xs">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        onClick={handleGalleryUpload}
        disabled={isLoading}
        data-testid="button-upload-gallery"
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Choose from gallery
      </Button>

      {onCancel && (
        <Button
          variant="ghost"
          onClick={handleCancel}
          data-testid="button-cancel"
          className="mt-4"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      )}
    </div>
  );
}
