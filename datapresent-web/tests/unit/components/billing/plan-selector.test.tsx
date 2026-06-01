import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanSelector } from "@/components/billing/PlanSelector";

const mockPlans = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    description: "Free plan",
    features: [],
    popular: false,
    cta: "Current",
    currentPlan: true,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 29,
    period: "/mois",
    description: "Pro plan",
    features: [],
    popular: true,
    cta: "Subscribe",
    currentPlan: false,
    stripePriceId: "price_pro",
  },
];

describe("PlanSelector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing", () => {
    render(<PlanSelector plans={mockPlans} />);
    expect(screen.getByText("Free")).toBeDefined();
    expect(screen.getByText("Pro")).toBeDefined();
  });

  it("calls fetch when a paid plan is selected", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/test" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, "location", { value: { href: "" }, writable: true });

    render(<PlanSelector plans={mockPlans} />);
    const subscribeButton = screen.getByText("Subscribe");
    fireEvent.click(subscribeButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO" }),
      });
    });

    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("does NOT call fetch for FREE plan", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<PlanSelector plans={mockPlans} />);
    // The PricingTable renders "Plan actuel" for currentPlan=true plans
    const freeButton = screen.getByText("Plan actuel");
    fireEvent.click(freeButton);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
