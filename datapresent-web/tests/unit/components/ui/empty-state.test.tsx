import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText("No items")).toBeDefined();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="No items" description="Add some items to get started" />);
    expect(screen.getByText("Add some items to get started")).toBeDefined();
  });

  it("renders action button when action provided without href", () => {
    render(<EmptyState title="No items" action={{ label: "Add item", onClick: () => {} }} />);
    expect(screen.getByText("Add item")).toBeDefined();
  });

  it("renders a Link when action.href is provided", () => {
    render(<EmptyState title="No items" action={{ label: "Go home", href: "/" }} />);
    const link = screen.getByText("Go home").closest("a");
    expect(link).toBeDefined();
    expect(link?.getAttribute("href")).toBe("/");
  });

  it('does not contain "undefined" in className', () => {
    const { container } = render(<EmptyState title="No items" />);
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("undefined");
  });
});
