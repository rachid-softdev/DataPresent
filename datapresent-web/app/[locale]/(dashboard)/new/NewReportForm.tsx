"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropZone } from "@/components/upload/DropZone";
import { DataPreview } from "@/components/upload/DataPreview";
import { SectorSelector } from "@/components/upload/SectorSelector";
import { SlideCountSlider } from "@/components/upload/SlideCountSlider";
import { Stepper, useReportSteps } from "@/components/upload/Stepper";
import { FlowContainer } from "@/components/upload/FlowContainer";
import { GenerationProgress, useGenerationSubStages } from "@/components/upload/GenerationProgress";
import { ReportResult } from "@/components/upload/ReportResult";
import { InlineHelp } from "@/components/ui/inline-help";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { StepId } from "@/components/upload/Stepper";

const STALL_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;

interface NewReportFormProps {
  maxSlides: number;
}

export default function NewReportForm({ maxSlides }: NewReportFormProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [sector, setSector] = useState(() => searchParams?.get("sector") || "GENERIC");
  const [slideCount, setSlideCount] = useState(10);

  // Stepper state
  const [currentStep, setCurrentStep] = useState<StepId>("upload");

  // Upload/generation state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeSubStage, setActiveSubStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [resultStatus, setResultStatus] = useState<"success" | "error" | null>(null);
  const [resultReportId, setResultReportId] = useState<string | undefined>(undefined);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastProgressRef = useRef<{ pct: number; time: number }>({ pct: 0, time: 0 });
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = useReportSteps(t);
  const subStages = useGenerationSubStages(t);

  // Polling timer for real report status after upload
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracks the report ID being polled after upload
  const reportIdRef = useRef<string | null>(null);

  // Visual sub-stage advancement timer while waiting for real status
  const visualStageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (visualStageTimerRef.current) clearInterval(visualStageTimerRef.current);
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

  /** Start polling for the report's real status */
  const startPolling = useCallback(
    (reportId: string) => {
      reportIdRef.current = reportId;

      // Reset visual sub-stages
      setActiveSubStage(0);

      // Advance visual sub-stages while polling
      visualStageTimerRef.current = setInterval(() => {
        setActiveSubStage((prev) => {
          if (prev < subStages.length - 1) return prev + 1;
          return prev;
        });
      }, 3500);

      // Poll the report API every POLL_INTERVAL_MS
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/reports/${reportId}`);
          if (!res.ok) return;

          const report = await res.json();

          if (report.status === "DONE") {
            // Generation complete
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            clearInterval(visualStageTimerRef.current!);
            visualStageTimerRef.current = null;
            clearStallTimer();
            setActiveSubStage(subStages.length - 1);
            setResultStatus("success");
            setResultReportId(reportId);
            setCurrentStep("result");
            toast.success(t("messages.reports.generated"));
          } else if (report.status === "ERROR") {
            // Generation failed
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            clearInterval(visualStageTimerRef.current!);
            visualStageTimerRef.current = null;
            clearStallTimer();
            setResultStatus("error");
            setError(t("errors.generic"));
            setCurrentStep("result");
            toast.error(t("errors.generic"));
          }
          // PROCESSING or PENDING: keep polling, reset stall timer
          resetStallTimer();
        } catch {
          // Silently retry on next interval
        }
      }, POLL_INTERVAL_MS);
    },
    [subStages.length, clearStallTimer, resetStallTimer, t],
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (visualStageTimerRef.current) {
      clearInterval(visualStageTimerRef.current);
      visualStageTimerRef.current = null;
    }
    reportIdRef.current = null;
  }, []);

  /** Abort the current XHR request */
  const handleCancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    stopPolling();
    clearStallTimer();
    setUploadProgress(0);
    setActiveSubStage(0);
    setError(null);
    setResultStatus(null);
    setCurrentStep("config");
  }, [clearStallTimer, stopPolling]);

  /** Proper retry: go back to config so user can re-initiate */
  const handleRetry = useCallback(() => {
    stopPolling();
    clearStallTimer();
    setUploadProgress(0);
    setActiveSubStage(0);
    setError(null);
    setResultStatus(null);
    setResultReportId(undefined);
    setCurrentStep("config");
  }, [clearStallTimer, stopPolling]);

  /** Start over from upload */
  const handleDismiss = useCallback(() => {
    stopPolling();
    clearStallTimer();
    setUploadProgress(0);
    setActiveSubStage(0);
    setError(null);
    setResultStatus(null);
    setResultReportId(undefined);
    setFile(null);
    setCurrentStep("upload");
  }, [clearStallTimer, stopPolling]);

  /** Submit: start the XHR upload */
  const handleSubmit = useCallback(() => {
    if (!file) return;

    setCurrentStep("generation");
    setUploadProgress(0);
    setActiveSubStage(0);
    setError(null);
    setStalled(false);
    setResultStatus(null);
    setResultReportId(undefined);

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
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          // Upload succeeded — start polling for real report status
          startPolling(data.reportId);
        } catch {
          stopPolling();
          clearStallTimer();
          setResultStatus("error");
          setError(t("errors.generic"));
          setCurrentStep("result");
          toast.error(t("errors.generic"));
        }
      } else {
        stopPolling();
        clearStallTimer();
        setResultStatus("error");
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
        setCurrentStep("result");
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      stopPolling();
      clearStallTimer();
      setResultStatus("error");
      const msg = t("upload.uploadError");
      setError(msg);
      toast.error(msg);
      setCurrentStep("result");
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      stopPolling();
      clearStallTimer();
    };

    xhr.open("POST", "/api/upload");
    xhr.send(formData);

    resetStallTimer();
  }, [file, sector, slideCount, t, clearStallTimer, resetStallTimer, startPolling, stopPolling]);

  /** Render step content */
  const renderStepContent = () => {
    switch (currentStep) {
      case "upload":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("upload.title")}</CardTitle>
                <CardDescription>{t("upload.dragDrop")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div data-onboarding="upload-zone">
                  <DropZone
                    onFileSelect={setFile}
                    accept=".xlsx,.xls,.csv,.pdf"
                    maxSize={10 * 1024 * 1024}
                  />
                  {file && (
                    <div className="mt-4">
                      <DataPreview file={file} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!file}
                onClick={() => setCurrentStep("config")}
                className="gap-2"
              >
                {t("common.next") || "Suivant"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case "config":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {t("upload.sector.title")}
                  <InlineHelp content="Le secteur permet à l'IA d'adapter le vocabulaire, les métriques et les graphiques à votre domaine d'activité." />
                </CardTitle>
                <CardDescription>{t("upload.sector.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div data-onboarding="sector-selector">
                  <SectorSelector value={sector} onChange={setSector} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("upload.slideCount.title")}</CardTitle>
                <CardDescription>{t("upload.slideCount.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <SlideCountSlider
                  value={slideCount}
                  onChange={setSlideCount}
                  min={5}
                  max={maxSlides}
                />
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep("upload")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("common.back") || "Retour"}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                data-onboarding="generate-button"
                className="gap-2"
              >
                {t("reports.generate")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case "generation":
        return (
          <Card>
            <CardContent className="p-6">
              <GenerationProgress
                progress={uploadProgress}
                subStages={subStages}
                activeSubStage={activeSubStage}
                stalled={stalled}
                stallMessage={t("upload.stallWarning")}
                onCancel={handleCancel}
                onRetry={handleRetry}
              />
            </CardContent>
          </Card>
        );

      case "result":
        return (
          <Card>
            <CardContent className="p-6">
              <ReportResult
                status={resultStatus}
                reportId={resultReportId}
                reportTitle={file?.name}
                errorMessage={error || undefined}
                onRetry={handleRetry}
                onDismiss={handleDismiss}
              />
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper header */}
      <Stepper steps={steps} currentStep={currentStep} />

      {/* Step content */}
      <FlowContainer stepKey={currentStep}>{renderStepContent()}</FlowContainer>
    </div>
  );
}
