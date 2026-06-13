import { HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface InlineHelpProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * A small question-mark circle icon that shows a tooltip on hover.
 * Use next to labels or terms that need clarification.
 */
export function InlineHelp({ content, side = "top" }: InlineHelpProps) {
  return (
    <Tooltip content={content} side={side}>
      <span className="inline-flex items-center cursor-help ml-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
      </span>
    </Tooltip>
  );
}
