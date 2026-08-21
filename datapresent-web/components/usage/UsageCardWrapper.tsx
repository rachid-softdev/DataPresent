"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const UsageCard = dynamic(() => import("./UsageCard").then((m) => ({ default: m.UsageCard })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
});

export function UsageCardWrapper() {
  return <UsageCard />;
}
