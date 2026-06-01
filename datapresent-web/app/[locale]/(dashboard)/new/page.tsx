"use client";

import { useState, useRef } from "react";
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

export default function NewReportPage() {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const [sector, setSector] = useState(useSearchParams()?.get("sector") || "GENERIC");
  const [slideCount, setSlideCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setUploadProgress(0);
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
      }
    };

    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          router.push(`/reports/${data.reportId}`);
        } catch {
          setLoading(false);
          toast.error(t("errors.generic"));
        }
      } else {
        setLoading(false);
        try {
          const data = JSON.parse(xhr.responseText);
          toast.error(t(data.error) || t("errors.generic"));
        } catch {
          toast.error(t("errors.generic"));
        }
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setLoading(false);
      toast.error(t("errors.generic"));
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      setLoading(false);
    };

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="app-heading app-heading-xl">{t("reports.new")}</h1>
        <p className="app-page-desc mt-1">{t("upload.title")}</p>
      </div>

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
                max={20}
                disabled={loading}
              />
            </CardContent>
          </Card>

          {/* Upload progress bar */}
          {loading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} max={100} className="h-3" />
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress < 100
                  ? `${t("upload.uploading")} ${uploadProgress}%`
                  : t("upload.processing")}
              </p>
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
    </div>
  );
}
