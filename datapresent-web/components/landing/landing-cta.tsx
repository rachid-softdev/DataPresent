import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
          <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
