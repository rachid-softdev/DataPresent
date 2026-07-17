"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface LandingFooterProps {
  description: string;
  copyright?: string;
}

export function LandingFooter({ description, copyright }: LandingFooterProps) {
  const year = new Date().getFullYear();
  const resolvedCopyright = copyright ?? `© ${year} DataPresent · Tous droits réservés`;
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
            <Link className="landing-footer-link" href="/#features">
              Fonctionnalités
            </Link>
            <Link className="landing-footer-link" href="/#pricing">
              Tarifs
            </Link>
            <Link className="landing-footer-link" href="/#formats">
              Formats supportés
            </Link>
            <Link className="landing-footer-link" href="/pricing">
              Comparateur
            </Link>
          </div>
          <div>
            <div className="landing-footer-col-title">Ressources</div>
            <Link className="landing-footer-link" href="/about">
              À propos
            </Link>
            <Link className="landing-footer-link" href="/blog">
              Blog
            </Link>
            <Link className="landing-footer-link" href="/help">
              Aide
            </Link>
          </div>
          <div>
            <div className="landing-footer-col-title">Légal</div>
            <Link className="landing-footer-link" href="/privacy">
              Confidentialité
            </Link>
            <Link className="landing-footer-link" href="/terms">
              CGU
            </Link>
            <Link className="landing-footer-link" href="/legal">
              Mentions légales
            </Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span className="landing-footer-copy">{resolvedCopyright}</span>
          <ThemeToggle className="landing-footer-theme-btn" />
        </div>
      </div>
    </footer>
  );
}
