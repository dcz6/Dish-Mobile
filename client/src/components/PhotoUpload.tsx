import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, X, Check, RotateCcw } from "lucide-react";

interface PhotoUploadProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
  mode: "dish" | "receipt";
}

export function PhotoUpload({ onCapture, onCancel, mode }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setPreview(imageData);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    setPreview(null);
    onCancel?.();
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

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file"
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

      <Button
        size="lg"
        onClick={handleCapture}
        disabled={isLoading}
        data-testid="button-capture-upload"
        className="rounded-full h-24 w-24 relative"
      >
        {isLoading ? (
          <div className="animate-spin w-8 h-8 border-2 border-primary-foreground border-t-transparent rounded-full" />
        ) : (
          <Camera className="w-10 h-10" />
        )}
      </Button>
      
      <p className="text-muted-foreground text-center text-sm">
        Tap to take a photo
      </p>

      <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        onClick={handleCapture}
        data-testid="button-upload-file"
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload from gallery
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
