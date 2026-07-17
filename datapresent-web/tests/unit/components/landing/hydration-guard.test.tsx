import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HydrationGuard } from "@/components/hooks/hydration-guard";

describe("HydrationGuard", () => {
  it("renders children after mount", () => {
    // In React 19 effects flush synchronously in act(), so children
    // are visible immediately after render().
    render(
      <HydrationGuard>
        <div>Mounted content</div>
      </HydrationGuard>,
    );
    expect(screen.getByText("Mounted content")).toBeDefined();
  });

  it("renders fallback when provided (children visible after mount)", () => {
    render(
      <HydrationGuard fallback={<div data-testid="fallback">Loading...</div>}>
        <div>Content</div>
      </HydrationGuard>,
    );
    // After mount, children are rendered (effects run sync in React 19)
    expect(screen.getByText("Content")).toBeDefined();
  });

  it("renders without crashing when no fallback provided", () => {
    const { container } = render(
      <HydrationGuard>
        <div>Content</div>
      </HydrationGuard>,
    );
    // After mount, the first child is the content
    expect(container.firstChild?.textContent).toBe("Content");
  });
});
