import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with default classes", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("animate-pulse");
    expect(div.className).toContain("rounded-md");
    expect(div.className).toContain("bg-muted");
  });

  it('does NOT contain literal "undefined" in className when no className prop', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain("undefined");
  });

  it('does NOT contain literal "undefined" when className prop is provided', () => {
    const { container } = render(<Skeleton className="w-10 h-10" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain("undefined");
    expect(div.className).toContain("w-10");
    expect(div.className).toContain("h-10");
  });

  it("forwards additional HTML props", () => {
    const { container } = render(<Skeleton id="test-id" data-testid="skeleton" />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute("id")).toBe("test-id");
  });

  it("renders as a div element", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });
});
