"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Zap, RefreshCw, Upload, Check, AlertCircle } from "lucide-react";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { triggerHaptic } from "@/lib/haptics";
import { playAlertChime } from "@/lib/notifications";

interface CameraPlateScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
  lang?: "ar" | "en";
}

export function CameraPlateScanner({
  isOpen,
  onClose,
  onPlateDetected,
  lang = "ar",
}: CameraPlateScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Start Camera
  const startCamera = async () => {
    setErrorMessage(null);
    setHasPermission(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage(
        lang === "ar"
          ? "الكاميرا غير مدعومة في هذا المتصفح. يمكنك رفع صورة اللوحة بدلاً من ذلك."
          : "Camera not supported in this browser. Please upload an image instead."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Rear camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setHasPermission(true);

      // Check Torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setHasPermission(false);
      setErrorMessage(
        lang === "ar"
          ? "تعذر فتح الكاميرا. يرجى التأكد من منح الإذن أو رفع صورة اللوحة."
          : "Could not access camera. Please allow camera access or upload an image."
      );
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
      triggerHaptic("selection");
    } catch {
      // Ignored
    }
  };

  // Preprocess canvas for high-contrast OCR
  const preprocessCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Convert to grayscale and apply contrast enhancement
    for (let i = 0; i < d.length; i += 4) {
      const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Binarize / High contrast threshold
      const binarized = avg > 120 ? 255 : 0;
      d[i] = binarized;
      d[i + 1] = binarized;
      d[i + 2] = binarized;
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Process image with Tesseract OCR
  const recognizePlateFromCanvas = async (sourceCanvas: HTMLCanvasElement) => {
    setIsProcessing(true);
    setStatusText(lang === "ar" ? "جارٍ قراءة اللوحة بالذكاء الاصطناعي..." : "Scanning plate with AI...");
    triggerHaptic("medium");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");

      await worker.setParameters({
        tessedit_char_whitelist: "0123456789٠١٢٣٤٥٦٧٨٩QATARqatarقطر",
      });

      const ret = await worker.recognize(sourceCanvas);
      await worker.terminate();

      const rawText = ret.data.text || "";
      // Extract numeric sequences
      const cleanDigits = rawText.replace(/[^0-9٠-٩]/g, "");

      if (cleanDigits && cleanDigits.length >= 1) {
        const normalized = normalizePlateNumber(cleanDigits);
        triggerHaptic("success");
        playAlertChime();
        onPlateDetected(normalized);
        onClose();
      } else {
        triggerHaptic("error");
        setStatusText(
          lang === "ar"
            ? "لم يتم العثور على أرقام واضحة. يرجى توجيه الإطار بدقة نحو اللوحة."
            : "No clear plate digits found. Please align frame with plate."
        );
      }
    } catch (err: any) {
      console.error("OCR recognition error:", err);
      triggerHaptic("error");
      setStatusText(
        lang === "ar"
          ? "حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى."
          : "Error processing image. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture current viewfinder frame
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    triggerHaptic("light");

    const canvas = document.createElement("canvas");
    // Crop center 60% width x 30% height corresponding to plate target frame
    const cropWidth = video.videoWidth * 0.7;
    const cropHeight = cropWidth * 0.45;
    const startX = (video.videoWidth - cropWidth) / 2;
    const startY = (video.videoHeight - cropHeight) / 2;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      preprocessCanvas(canvas);
      recognizePlateFromCanvas(canvas);
    }
  };

  // Handle uploaded image file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          preprocessCanvas(canvas);
          recognizePlateFromCanvas(canvas);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative flex flex-col w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-slate-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qatar text-white">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-arabic">
                {lang === "ar" ? "مسح اللوحة بالكاميرا" : "Camera Plate OCR"}
              </h3>
              <p className="text-caption text-slate-500">
                {lang === "ar" ? "وجّه الكاميرا نحو لوحة السيارة القطرية" : "Point camera at Qatar license plate"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  torchOn ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-slate-300"
                }`}
                title={lang === "ar" ? "إضاءة الفلاش" : "Flash light"}
              >
                <Zap className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black flex items-center justify-center">
          {hasPermission && (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="h-full w-full object-cover"
            />
          )}

          {/* Qatar Plate Target Frame Guide Overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="relative flex h-24 sm:h-28 w-64 sm:w-80 items-stretch overflow-hidden rounded-xl border-2 border-dashed border-emerald-400 bg-black/25 shadow-2xl backdrop-blur-[1px]">
              {/* Corner Targeting Accents */}
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-emerald-400" />

              {/* Qatar Emblem Guide on Left */}
              <div className="flex flex-col items-center justify-center bg-qatar/80 px-3 text-[9px] font-bold text-white border-r border-white/20"> {/* mobile-audit-ignore: plate artwork microprint */}
                <span>قطر</span>
                <span>QATAR</span>
              </div>

              {/* Number Window Guide */}
              <div className="flex flex-1 items-center justify-center">
                <span className="text-xs font-mono font-bold tracking-widest text-emerald-300/80 animate-pulse">
                  {lang === "ar" ? "[ضع أرقام اللوحة هنا]" : "[place plate digits here]"}
                </span>
              </div>
            </div>
          </div>

          {/* Processing Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
              <RefreshCw className="h-10 w-10 text-qatar animate-spin" />
              <p className="mt-3 text-sm font-bold text-white font-arabic">{statusText}</p>
            </div>
          )}

          {/* Error / Permission Denied Box */}
          {errorMessage && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-sm text-slate-300 mb-4">{errorMessage}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-qatar px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-qatar-800"
              >
                <Upload className="h-4 w-4" />
                <span>{lang === "ar" ? "اختيار صورة من الاستوديو" : "Upload Plate Photo"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusText && !isProcessing && (
          <div className="bg-amber-950/50 px-4 py-2 text-center text-xs font-semibold text-amber-300 border-t border-amber-900/50">
            {statusText}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{lang === "ar" ? "استوديو الصور" : "Upload"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            disabled={isProcessing || !hasPermission}
            onClick={handleCaptureFrame}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-qatar py-3 px-4 text-sm font-bold text-white shadow-lg shadow-qatar/30 transition active:scale-95 hover:bg-qatar-800 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            <span>{lang === "ar" ? "مسح اللوحة الآن" : "Scan Plate Now"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
