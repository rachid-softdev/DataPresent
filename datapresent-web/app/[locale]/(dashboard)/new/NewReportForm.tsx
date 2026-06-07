"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { DropZone } from "@/components/upload/DropZone";
import { DataPreview } from "@/components/upload/DataPreview";
import { SectorSelector } from "@/components/upload/SectorSelector";
import { SlideCountSlider } from "@/components/upload/SlideCountSlider";

const STALL_TIMEOUT_MS = 30_000;

interface NewReportFormProps {
  maxSlides: number;
}

export default function NewReportForm({ maxSlides }: NewReportFormProps) {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const searchParams = useSearchParams();
  const [sector, setSector] = useState(() => searchParams?.get("sector") || "GENERIC");
  const [slideCount, setSlideCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastProgressRef = useRef<{ pct: number; time: number }>({ pct: 0, time: 0 });
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Clear stall timer on unmount
  useEffect(() => {
    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, []);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    setStalled(false);
  }, []);

  const resetStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      setStalled(true);
    }, STALL_TIMEOUT_MS);
  }, [clearStallTimer]);

  const handleCancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    clearStallTimer();
    setLoading(false);
    setUploadProgress(0);
    setError(null);
  }, [clearStallTimer]);

  const handleRetry = useCallback(() => {
    setError(null);
    setStalled(false);
    setUploadProgress(0);
    // Re-submit by dispatching submit on the form
    // The form ref approach is cleaner; we'll just set error to null and let user re-click
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setUploadProgress(0);
    setError(null);
    setStalled(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sector", sector);
    formData.append("slideCount", slideCount.toString());

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(pct);

        // Stall detection: reset timer if progress advanced
        const now = Date.now();
        const last = lastProgressRef.current;
        if (pct !== last.pct) {
          lastProgressRef.current = { pct, time: now };
          resetStallTimer();
        }
      }
    };

    xhr.onload = () => {
      xhrRef.current = null;
      clearStallTimer();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          router.push(`/reports/${data.reportId}`);
        } catch {
          setLoading(false);
          setError(t("errors.generic"));
          toast.error(t("errors.generic"));
        }
      } else {
        setLoading(false);
        try {
          const data = JSON.parse(xhr.responseText);
          const msg = t(data.error) || t("errors.generic");
          setError(msg);
          toast.error(msg);
        } catch {
          const msg = t("errors.generic");
          setError(msg);
          toast.error(msg);
        }
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      clearStallTimer();
      setLoading(false);
      const msg = t("upload.uploadError");
      setError(msg);
      toast.error(msg);
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      clearStallTimer();
      setLoading(false);
    };

    xhr.open("POST", "/api/upload");
    xhr.send(formData);

    // Start stall timer on first send
    resetStallTimer();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. {t("upload.title")}</CardTitle>
            <CardDescription>{t("upload.dragDrop")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div data-onboarding="upload-zone">
              <DropZone
                onFileSelect={setFile}
                accept=".xlsx,.xls,.csv,.pdf"
                maxSize={10 * 1024 * 1024}
                disabled={loading}
              />
              {file && (
                <div className="mt-4">
                  <DataPreview file={file} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. {t("upload.sector.title")}</CardTitle>
            <CardDescription>{t("upload.sector.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div data-onboarding="sector-selector">
              <SectorSelector value={sector} onChange={setSector} disabled={loading} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. {t("upload.slideCount.title")}</CardTitle>
            <CardDescription>{t("upload.slideCount.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SlideCountSlider
              value={slideCount}
              onChange={setSlideCount}
              min={5}
              max={maxSlides}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {/* Upload progress bar + cancel + stall warning */}
        {loading && (
          <div className="space-y-3">
            <Progress value={uploadProgress} max={100} className="h-3" />
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {uploadProgress < 100
                  ? `${t("upload.uploading")} ${uploadProgress}%`
                  : t("upload.processing")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-destructive hover:text-destructive"
              >
                {t("common.cancel")}
              </Button>
            </div>
            {stalled && (
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                {t("upload.stallWarning")}
              </p>
            )}
          </div>
        )}

        {/* Upload error state with retry */}
        {error && !loading && (
          <div className="space-y-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <p className="text-sm text-destructive text-center">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mx-auto block"
            >
              {t("upload.retry")}
            </Button>
          </div>
        )}

        <Button
          type="submit"
          disabled={!file || loading}
          className="w-full text-lg py-6"
          data-onboarding="generate-button"
        >
          {loading ? <Spinner className="mx-auto" /> : t("reports.generate")}
        </Button>
      </div>
    </form>
  );
}
