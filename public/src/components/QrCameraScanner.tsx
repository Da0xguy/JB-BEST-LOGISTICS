import React, { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Camera, X } from "lucide-react";

interface QrCameraScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export const extractTrackingId = (payload: string) => {
  let candidate = payload.trim();
  try {
    const decoded = JSON.parse(candidate) as { trackingId?: string };
    if (decoded.trackingId) candidate = decoded.trackingId;
  } catch {
    if (/^https?:\/\//i.test(candidate)) {
      candidate =
        new URL(candidate).pathname.split("/").filter(Boolean).at(-1) || "";
    }
  }
  candidate = candidate.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(candidate)) {
    throw new Error("QR code does not contain a valid tracking ID.");
  }
  return candidate;
};

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScan,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let isDisposed = false;
    let hasScanned = false;
    const video = videoRef.current;
    if (!video) return;

    const startCamera = async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (isDisposed) return;
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result, _error, scanControls) => {
            if (isDisposed) return;
            controls = scanControls;
            if (!result || hasScanned) return;
            hasScanned = true;
            scanControls.stop();
            onScanRef.current(result.getText());
          },
        );
        if (isDisposed) controls.stop();
      } catch (cameraError: unknown) {
        if (!isDisposed) {
          setError(
            cameraError instanceof Error
              ? cameraError.message
              : "Unable to start the camera. Check camera permissions and try again.",
          );
        }
      }
    };

    void startCamera();
    return () => {
      isDisposed = true;
      controls?.stop();
    };
  }, []);

  return (
    <section className="space-y-3 border border-slate-200 bg-slate-950 p-4 text-white">
      <header className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Camera className="h-4 w-4" /> Scan shipment QR code
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stop scanning"
          className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <video
        ref={videoRef}
        muted
        playsInline
        className="max-h-[55vh] w-full bg-black object-contain"
      />
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
};
