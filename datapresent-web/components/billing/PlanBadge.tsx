import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  plan: string;
  className?: string;
}

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  FREE: {
    label: "Gratuit",
    className: "bg-muted text-muted-foreground",
  },
  STARTER: {
    label: "Starter",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  PRO: {
    label: "Pro",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  ULTRA: {
    label: "Ultra",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
};

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.FREE;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
