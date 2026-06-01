import Link from "next/link";

interface LandingCtaProps {
  title: React.ReactNode;
  body: string;
  button: string;
}

export function LandingCta({ title, body, button }: LandingCtaProps) {
  return (
    <section className="landing-cta-section">
      <div className="landing-container-xs landing-cta-inner">
        <h2 className="landing-cta-title">{title}</h2>
        <p className="landing-cta-body">{body}</p>
        <Link href="/signup" className="landing-btn landing-btn-white landing-btn-xl">
          {button}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
