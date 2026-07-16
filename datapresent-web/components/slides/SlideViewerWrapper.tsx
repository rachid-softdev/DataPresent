"use client";

import type { Slide } from "@prisma/client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

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
