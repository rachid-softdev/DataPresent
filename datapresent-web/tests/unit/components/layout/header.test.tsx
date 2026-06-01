import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/layout/header";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      login: "Connexion",
      signup: "Inscription",
    };
    return translations[key] || key;
  },
}));

// Mock ThemeToggle to avoid ThemeProvider dependency
vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle theme</button>,
}));

describe("Header", () => {
  it("renders without crashing", () => {
    render(<Header />);
    expect(screen.getByText("DataPresent")).toBeDefined();
  });

  it("shows auth links by default (hideAuth=false)", () => {
    render(<Header />);
    expect(screen.getByText("Connexion")).toBeDefined();
    expect(screen.getByText("Inscription")).toBeDefined();
  });

  it("hides auth links when hideAuth=true", () => {
    render(<Header hideAuth={true} />);
    expect(screen.queryByText("Connexion")).toBeNull();
    expect(screen.queryByText("Inscription")).toBeNull();
  });
});
