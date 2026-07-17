import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

interface LandingHeroProps {
  badge: string;
  title: React.ReactNode;
  body: string;
  cta: string;
  note: string;
}

export function LandingHero({ badge, title, body, cta, note }: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div className="landing-container">
        {/* Hero split layout */}
        <div className="landing-hero-split">
          {/* Left: text content */}
          <div className="landing-hero-text">
            <div className="landing-hero-eyebrow anim-up">
              <span className="landing-dot"></span>
              {badge}
            </div>
            <h1 className="landing-display landing-hero-display anim-up-1">{title}</h1>
            <p className="landing-body-lg landing-hero-body anim-up-2">{body}</p>
            <div className="landing-hero-cta anim-up-3">
              <Link href="/signup" className="landing-btn landing-btn-primary landing-btn-xl">
                {cta}
                <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
              </Link>
              <span className="landing-hero-note">
                <Check className="w-[14px] h-[14px]" aria-hidden="true" />
                {note}
              </span>
            </div>
          </div>

          {/* Right: product mockup */}
          <div
            className="landing-hero-visual anim-up-2"
            aria-label="Aperçu de l'interface DataPresent"
          >
            <DashboardMockup />
          </div>
        </div>

        {/* Proof bar — narrative, not a stat grid */}
        <div
          className="anim-up-4"
          style={{
            marginTop: 60,
            padding: "16px 24px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--landing-primary) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--landing-primary) 12%, transparent)",
            fontSize: "0.9rem",
            color: "var(--landing-text2)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--landing-text)", fontWeight: 600 }}>
            Plus de 10 000 présentations
          </strong>{" "}
          générées en moins de 30 secondes chacune par des centaines d&apos;équipes.
        </div>
      </div>
    </section>
  );
}

/** Inline SVG mockup of the DataPresent dashboard. */
function DashboardMockup() {
  return (
    <svg
      viewBox="0 0 520 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="landing-mockup-svg"
      role="img"
      aria-label="Capture d'écran du tableau de bord DataPresent"
    >
      {/* Device frame */}
      <rect
        x="4"
        y="4"
        width="512"
        height="392"
        rx="16"
        fill="var(--landing-surface)"
        stroke="var(--landing-border)"
        strokeWidth="1"
      />

      {/* Top bar */}
      <rect x="4" y="4" width="512" height="52" rx="16" fill="var(--landing-surface)" />
      <rect x="4" y="40" width="512" height="16" fill="var(--landing-surface)" />
      <rect
        x="20"
        y="18"
        width="120"
        height="18"
        rx="4"
        fill="var(--landing-primary)"
        opacity="0.1"
      />
      <rect
        x="20"
        y="22"
        width="80"
        height="10"
        rx="2"
        fill="var(--landing-primary)"
        opacity="0.7"
      />

      {/* Top bar right icons */}
      <circle cx="470" cy="28" r="6" fill="var(--landing-border)" />
      <circle cx="488" cy="28" r="6" fill="var(--landing-border)" />

      {/* KPI Cards row */}
      <g>
        {/* KPI 1 */}
        <g className="mu-kpi">
          <rect
            x="20"
            y="66"
            width="152"
            height="78"
            rx="12"
            fill="var(--landing-surface)"
            stroke="var(--landing-border)"
            strokeWidth="1"
          />
          <rect x="20" y="66" width="152" height="3" rx="1.5" fill="var(--landing-primary)" />
          <text
            x="34"
            y="100"
            fontFamily="DM Sans, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="var(--landing-text)"
          >
            1,284
          </text>
          <text
            x="34"
            y="128"
            fontFamily="DM Sans, sans-serif"
            fontSize="11"
            fill="var(--landing-text3)"
          >
            Rapports ce mois
          </text>
          <rect x="110" y="88" width="48" height="20" rx="10" fill="var(--landing-pill-bg)" />
          <text
            x="122"
            y="102"
            fontFamily="DM Sans, sans-serif"
            fontSize="10"
            fontWeight="600"
            fill="var(--landing-pill-text)"
          >
            +12.5%
          </text>
        </g>

        {/* KPI 2 */}
        <g className="mu-kpi">
          <rect
            x="184"
            y="66"
            width="152"
            height="78"
            rx="12"
            fill="var(--landing-surface)"
            stroke="var(--landing-border)"
            strokeWidth="1"
          />
          <rect x="184" y="66" width="152" height="3" rx="1.5" fill="var(--landing-primary)" />
          <text
            x="198"
            y="100"
            fontFamily="DM Sans, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="var(--landing-text)"
          >
            47s
          </text>
          <text
            x="198"
            y="128"
            fontFamily="DM Sans, sans-serif"
            fontSize="11"
            fill="var(--landing-text3)"
          >
            Temps moyen
          </text>
        </g>

        {/* KPI 3 */}
        <g className="mu-kpi">
          <rect
            x="348"
            y="66"
            width="152"
            height="78"
            rx="12"
            fill="var(--landing-surface)"
            stroke="var(--landing-border)"
            strokeWidth="1"
          />
          <rect x="348" y="66" width="152" height="3" rx="1.5" fill="var(--landing-primary)" />
          <text
            x="362"
            y="100"
            fontFamily="DM Sans, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="var(--landing-text)"
          >
            98 %
          </text>
          <text
            x="362"
            y="128"
            fontFamily="DM Sans, sans-serif"
            fontSize="11"
            fill="var(--landing-text3)"
          >
            Satisfaction
          </text>
        </g>
      </g>

      {/* Report list card */}
      <rect
        x="20"
        y="156"
        width="310"
        height="228"
        rx="12"
        fill="var(--landing-surface)"
        stroke="var(--landing-border)"
        strokeWidth="1"
      />
      {/* Card header */}
      <rect
        x="36"
        y="172"
        width="100"
        height="6"
        rx="3"
        fill="var(--landing-text)"
        opacity="0.15"
      />
      <rect
        x="36"
        y="182"
        width="140"
        height="4"
        rx="2"
        fill="var(--landing-text)"
        opacity="0.08"
      />

      {/* Report rows */}
      <g className="mu-list-item">
        <rect
          x="36"
          y="204"
          width="8"
          height="8"
          rx="4"
          fill="var(--landing-accent)"
          opacity="0.6"
        />
        <rect
          x="52"
          y="206"
          width="130"
          height="4"
          rx="2"
          fill="var(--landing-text)"
          opacity="0.12"
        />
        <rect
          x="240"
          y="206"
          width="50"
          height="4"
          rx="2"
          fill="var(--landing-accent)"
          opacity="0.2"
        />
      </g>
      <g className="mu-list-item">
        <rect
          x="36"
          y="224"
          width="8"
          height="8"
          rx="4"
          fill="var(--landing-accent)"
          opacity="0.6"
        />
        <rect
          x="52"
          y="226"
          width="110"
          height="4"
          rx="2"
          fill="var(--landing-text)"
          opacity="0.12"
        />
        <rect
          x="240"
          y="226"
          width="50"
          height="4"
          rx="2"
          fill="var(--landing-accent)"
          opacity="0.2"
        />
      </g>
      <g className="mu-list-item">
        <rect
          x="36"
          y="244"
          width="8"
          height="8"
          rx="4"
          fill="var(--landing-accent)"
          opacity="0.6"
        />
        <rect
          x="52"
          y="246"
          width="150"
          height="4"
          rx="2"
          fill="var(--landing-text)"
          opacity="0.12"
        />
        <rect
          x="240"
          y="246"
          width="50"
          height="4"
          rx="2"
          fill="var(--landing-accent)"
          opacity="0.2"
        />
      </g>
      <g className="mu-list-item">
        <rect
          x="36"
          y="264"
          width="8"
          height="8"
          rx="4"
          fill="var(--landing-accent)"
          opacity="0.6"
        />
        <rect
          x="52"
          y="266"
          width="120"
          height="4"
          rx="2"
          fill="var(--landing-text)"
          opacity="0.12"
        />
        <rect
          x="240"
          y="266"
          width="50"
          height="4"
          rx="2"
          fill="var(--landing-accent)"
          opacity="0.2"
        />
      </g>

      {/* Divider */}
      <rect x="36" y="288" width="278" height="1" fill="var(--landing-border)" />

      {/* New report CTA row */}
      <rect
        x="36"
        y="302"
        width="120"
        height="10"
        rx="5"
        fill="var(--landing-primary)"
        opacity="0.9"
      />
      <rect
        x="162"
        y="302"
        width="60"
        height="10"
        rx="5"
        fill="var(--landing-primary)"
        opacity="0.15"
      />

      {/* Bar chart card */}
      <rect
        x="342"
        y="156"
        width="158"
        height="228"
        rx="12"
        fill="var(--landing-surface)"
        stroke="var(--landing-border)"
        strokeWidth="1"
      />
      {/* Chart title */}
      <rect
        x="358"
        y="172"
        width="80"
        height="6"
        rx="3"
        fill="var(--landing-text)"
        opacity="0.15"
      />

      {/* Bar chart bars */}
      <rect
        className="mu-bar"
        x="365"
        y="240"
        width="14"
        height="70"
        rx="3"
        fill="var(--landing-primary)"
        opacity="0.6"
      />
      <rect
        className="mu-bar"
        x="387"
        y="220"
        width="14"
        height="90"
        rx="3"
        fill="var(--landing-primary)"
        opacity="0.4"
      />
      <rect
        className="mu-bar mu-shimmer"
        x="409"
        y="200"
        width="14"
        height="110"
        rx="3"
        fill="var(--landing-accent)"
        opacity="0.7"
      />
      <rect
        className="mu-bar"
        x="431"
        y="230"
        width="14"
        height="80"
        rx="3"
        fill="var(--landing-primary)"
        opacity="0.5"
      />
      <rect
        className="mu-bar"
        x="453"
        y="250"
        width="14"
        height="60"
        rx="3"
        fill="var(--landing-primary)"
        opacity="0.35"
      />

      {/* X-axis labels */}
      <text
        x="366"
        y="330"
        fontFamily="DM Sans, sans-serif"
        fontSize="8"
        fill="var(--landing-text3)"
        opacity="0.5"
      >
        Lun
      </text>
      <text
        x="386"
        y="330"
        fontFamily="DM Sans, sans-serif"
        fontSize="8"
        fill="var(--landing-text3)"
        opacity="0.5"
      >
        Mar
      </text>
      <text
        x="410"
        y="330"
        fontFamily="DM Sans, sans-serif"
        fontSize="8"
        fill="var(--landing-text3)"
        opacity="0.5"
      >
        Mer
      </text>
      <text
        x="432"
        y="330"
        fontFamily="DM Sans, sans-serif"
        fontSize="8"
        fill="var(--landing-text3)"
        opacity="0.5"
      >
        Jeu
      </text>
      <text
        x="453"
        y="330"
        fontFamily="DM Sans, sans-serif"
        fontSize="8"
        fill="var(--landing-text3)"
        opacity="0.5"
      >
        Ven
      </text>
    </svg>
  );
}
