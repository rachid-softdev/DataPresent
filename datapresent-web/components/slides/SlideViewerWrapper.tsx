"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
// Minimal type matching SlideViewer's expected Slide shape
interface Slide {
  id: string;
  title: string;
  position: number;
  content: unknown;
  layout: string;
}

const SlideViewer = dynamic(
  () => import("@/components/slides/SlideViewer").then((m) => ({ default: m.SlideViewer })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
  },
);

interface SlideViewerWrapperProps {
  slides: Slide[];
  reportId: string;
}

export function SlideViewerWrapper({ slides, reportId }: SlideViewerWrapperProps) {
  return <SlideViewer slides={slides} reportId={reportId} />;
}
