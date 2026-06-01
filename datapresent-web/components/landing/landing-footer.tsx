"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

interface LandingFooterProps {
  description: string;
  copyright?: string;
}

export function LandingFooter({
  description,
  copyright = "© 2025 DataPresent · Tous droits réservés",
}: LandingFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer-grid">
          <div>
            <Link href="/" className="landing-logo" style={{ display: "inline-flex" }}>
              <div className="landing-logo-mark" style={{ background: "rgba(255,255,255,0.1)" }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2.5"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 16l4-8 4 4 4-6" />
                </svg>
              </div>
              <span className="landing-logo-text" style={{ color: "#fff" }}>
                DataPresent
              </span>
            </Link>
            <p className="landing-footer-desc">{description}</p>
          </div>
          <div>
            <div className="landing-footer-col-title">Produit</div>
            <Link className="landing-footer-link" href="#">
              Fonctionnalités
            </Link>
            <Link className="landing-footer-link" href="#">
              Tarifs
            </Link>
            <Link className="landing-footer-link" href="#">
              Formats supportés
            </Link>
            <Link className="landing-footer-link" href="#">
              Templates
            </Link>
          </div>
          <div>
            <div className="landing-footer-col-title">Légal</div>
            <Link className="landing-footer-link" href="#">
              Confidentialité
            </Link>
            <Link className="landing-footer-link" href="#">
              CGU
            </Link>
            <Link className="landing-footer-link" href="#">
              Mentions légales
            </Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span className="landing-footer-copy">{copyright}</span>
          <ThemeToggle className="landing-footer-theme-btn" />
        </div>
      </div>
    </footer>
  );
}
