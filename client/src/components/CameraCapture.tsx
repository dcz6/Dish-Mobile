import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      setError("Unable to access camera. Please grant permission and try again.");
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCapturedImage(null);
    }
  }, [capturedImage, onCapture]);

  const handleCancel = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    onCancel?.();
  }, [stopCamera, onCancel]);

  if (capturedImage) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex-1 relative flex items-center justify-center">
          <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />
        </div>
        <div className="flex items-center justify-center gap-6 p-6 pb-8 bg-black/80">
          <Button
            variant="outline"
            size="lg"
            onClick={retake}
            data-testid="button-retake"
            className="rounded-full px-8"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Retake
          </Button>
          <Button
            size="lg"
            onClick={confirm}
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

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        {error && (
          <div className="text-destructive text-center px-4 mb-4">{error}</div>
        )}
        <Button
          size="lg"
          onClick={startCamera}
          data-testid="button-start-camera"
          className="rounded-full h-20 w-20"
        >
          <Camera className="w-8 h-8" />
        </Button>
        <p className="text-muted-foreground text-center">Tap to open camera</p>
        {onCancel && (
          <Button variant="ghost" onClick={handleCancel} data-testid="button-cancel-camera">
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black relative">
      <video
        ref={videoRef}
        className="flex-1 object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-6 pb-8">
        <Button
          size="lg"
          onClick={capturePhoto}
          data-testid="button-capture"
          className="rounded-full h-20 w-20 bg-white hover:bg-white/90 text-black shadow-lg"
        >
          <div className="w-14 h-14 rounded-full border-4 border-black/20" />
        </Button>
      </div>
      
      {onCancel && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          data-testid="button-close-camera"
          className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
