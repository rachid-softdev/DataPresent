import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

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
        <Link href="/pricing" className="landing-btn landing-btn-white landing-btn-xl">
          {button}
          <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
        </Link>
        <p className="landing-cta-risk">
          <ShieldCheck className="w-[14px] h-[14px]" aria-hidden="true" />
          30 jours satisfait ou remboursé · Annulation à tout moment
        </p>
      </div>
    </section>
  );
}
