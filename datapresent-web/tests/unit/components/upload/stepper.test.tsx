import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stepper } from "@/components/upload/Stepper";

const STEPS = [
  { id: "upload" as const, label: "Import", icon: () => null },
  { id: "config" as const, label: "Config", icon: () => null },
  { id: "generation" as const, label: "Génération", icon: () => null },
  { id: "result" as const, label: "Résultat", icon: () => null },
];

describe("Stepper", () => {
  it("renders all steps", () => {
    render(<Stepper steps={STEPS} currentStep="upload" />);
    expect(screen.getByText("Import")).toBeTruthy();
    expect(screen.getByText("Config")).toBeTruthy();
    expect(screen.getByText("Génération")).toBeTruthy();
    expect(screen.getByText("Résultat")).toBeTruthy();
  });

  it("marks first step as current when on step 1", () => {
    render(<Stepper steps={STEPS} currentStep="upload" />);
    const steps = screen.getAllByRole("listitem");
    // Second step circle should have aria-current="step"
    expect(screen.getByText("En cours")).toBeTruthy();
  });

  it("marks completed steps with checkmark when past them", () => {
    const { container } = render(<Stepper steps={STEPS} currentStep="generation" />);
    // Steps 1 and 2 are completed (upload, config)
    const svgs = container.querySelectorAll("svg");
    // Completed steps render a checkmark SVG
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("has accessible navigation landmark", () => {
    render(<Stepper steps={STEPS} currentStep="upload" />);
    expect(screen.getByRole("navigation")).toBeTruthy();
  });
});
