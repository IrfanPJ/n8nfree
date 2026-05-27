"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraScannerProps {
  onDetected: (value: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onDetected, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const detectedRef = useRef(false);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    stopStream();
    detectedRef.current = false;
    setError(null);

    // Cancellation flag: if the component unmounts or facing changes while getUserMedia
    // is still pending, the resolved stream is stopped immediately and never assigned.
    let cancelled = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      // Lazy-load jsqr only on client when camera starts
      const jsQR = (await import("jsqr")).default;

      // Set canvas dimensions once when video metadata is known — not on every frame
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
      }

      // Throttle to ~10fps — jsQR on a full 1280×720 frame is expensive on mobile
      let lastScan = 0;
      const scan = (ts: number) => {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(scan);
        if (ts - lastScan < 100) return; // ~10fps
        lastScan = ts;

        if (!canvas || !video || video.readyState < 2) return;

        // Only resize canvas if video dimensions actually changed (e.g. after orientation change)
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data && !detectedRef.current) {
          detectedRef.current = true;
          cancelled = true;
          stopStream();
          onDetected(code.data);
        }
      };
      rafRef.current = requestAnimationFrame(scan);

      // Return cleanup to set cancelled flag when effect tears down
      return () => { cancelled = true; };
    } catch (err: any) {
      if (!cancelled) {
        if (err?.name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera permission and try again.");
        } else if (err?.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Could not start camera.");
        }
      }
    }
  }, [stopStream, onDetected]);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    startCamera(facingMode).then((fn) => { cleanupFn = fn; });
    return () => {
      cleanupFn?.();
      stopStream();
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = () => {
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-sm font-semibold">Scan QR Code</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFlip}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Flip camera"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => { stopStream(); onClose(); }}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Camera feed */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-8 space-y-4">
            <p className="text-white/70 text-sm">{error}</p>
            <Button variant="outline" onClick={() => startCamera(facingMode)} className="text-white border-white/30">
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder overlay */}
            <div className="relative z-10 w-64 h-64">
              {(["tl","tr","bl","br"] as const).map((corner) => (
                <span
                  key={corner}
                  className={cn(
                    "absolute w-8 h-8 border-[#D4AF37]",
                    corner === "tl" && "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md",
                    corner === "tr" && "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md",
                    corner === "bl" && "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md",
                    corner === "br" && "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md",
                  )}
                />
              ))}
              <div className="absolute inset-x-0 h-0.5 bg-[#D4AF37]/70 animate-scan-line" />
            </div>
          </>
        )}
      </div>

      {/* Bottom hint */}
      <div className="px-4 py-4 text-center bg-black/60 backdrop-blur-sm">
        <p className="text-white/50 text-xs">Align the QR code within the frame</p>
      </div>
    </div>
  );
}
