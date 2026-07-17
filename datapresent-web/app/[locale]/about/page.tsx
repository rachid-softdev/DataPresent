import "@/app/landing.css";

import { ArrowRight } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    fr: "À propos - DataPresent | Transformez vos données en présentations percutantes",
    en: "About - DataPresent | Transform your data into impactful presentations",
  };

  const descriptions: Record<string, string> = {
    fr: "Découvrez l'histoire de DataPresent, notre mission, nos valeurs et notre équipe. Nous rendons la création de présentations de données simple, rapide et naturelle.",
    en: "Discover the DataPresent story, our mission, values and team. We make data presentation creation simple, fast and natural.",
  };

  return {
    title: (titles as Record<string, string>)[locale] || titles.fr,
    description: (descriptions as Record<string, string>)[locale] || descriptions.fr,
    openGraph: {
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      url: `/${locale}/about`,
      siteName: "DataPresent",
    },
    alternates: {
      languages: {
        fr: "/fr/about",
        en: "/en/about",
      },
    },
  };
}

const VALUES: Record<
  string,
  { fr: { title: string; desc: string }; en: { title: string; desc: string } }
> = {
  confiant: {
    fr: {
      title: "Confiant",
      desc: "Nous croyons en la transparence. Pas de boîte noire, pas d'IA magique. Nos utilisateurs comprennent ce que fait l'outil et pourquoi.",
    },
    en: {
      title: "Confident",
      desc: "We believe in transparency. No black box, no magical AI. Our users understand what the tool does and why.",
    },
  },
  naturel: {
    fr: {
      title: "Naturel",
      desc: "Notre interface s'efface pour laisser vos données parler. Pas de friction, pas de courbe d'apprentissage. Juste votre travail, plus fluide.",
    },
    en: {
      title: "Natural",
      desc: "Our interface steps back to let your data speak. No friction, no learning curve. Just your work, flowing freely.",
    },
  },
  precis: {
    fr: {
      title: "Précis",
      desc: "Chaque pixel compte. Chaque graphique raconte une histoire. Nous ne produisons pas des slides — nous produisons de la clarté.",
    },
    en: {
      title: "Precise",
      desc: "Every pixel matters. Every chart tells a story. We don't produce slides — we produce clarity.",
    },
  },
};

interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

const TEAM: { fr: TeamMember[]; en: TeamMember[] } = {
  fr: [
    {
      name: "Alexandre Renard",
      role: "Fondateur & CEO",
      bio: "Ancien consultant en stratégie, Alexandre a passé 10 ans à créer des présentations pour des comités de direction. DataPresent est né de sa frustration personnelle.",
    },
    {
      name: "Sophie Leclerc",
      role: "CTO",
      bio: "Experte en IA et traitement du langage naturel, Sophie construit les modèles qui transforment vos données en slides percutantes.",
    },
    {
      name: "Marc Dubois",
      role: "Head of Design",
      bio: "Designer produit depuis 12 ans, Marc veille à ce que chaque interface soit aussi élégante qu'intuitive.",
    },
  ],
  en: [
    {
      name: "Alexandre Renard",
      role: "Founder & CEO",
      bio: "Former strategy consultant, Alexandre spent 10 years creating presentations for executive committees. DataPresent was born from his personal frustration.",
    },
    {
      name: "Sophie Leclerc",
      role: "CTO",
      bio: "AI and NLP expert, Sophie builds the models that transform your data into impactful slides.",
    },
    {
      name: "Marc Dubois",
      role: "Head of Design",
      bio: "Product designer for 12 years, Marc ensures every interface is as elegant as it is intuitive.",
    },
  ],
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const t = await getTranslations("about");
  const isFr = locale === "fr";
  const values = Object.values(VALUES).map((v) => (isFr ? v.fr : v.en));
  const team = TEAM[locale as keyof typeof TEAM] || TEAM.en;

  return (
    <div className="landing-hero" style={{ paddingTop: 0 }}>
      {/* ═══ Hero ═══ */}
      <section className="landing-section" style={{ paddingBottom: 0 }}>
        <div className="landing-container landing-container-xs">
          <div className="landing-hero-text" style={{ textAlign: "center", alignItems: "center" }}>
            <div className="landing-hero-eyebrow" style={{ marginBottom: "1.5rem" }}>
              <span className="landing-dot"></span>
              {t("badge")}
            </div>
            <h1 className="landing-display landing-hero-display">{t("title")}</h1>
            <p className="landing-body-lg landing-hero-body" style={{ maxWidth: 560 }}>
              {t("subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Story ═══ */}
      <section className="landing-section">
        <div className="landing-container landing-container-xs">
          <h2 className="landing-heading-lg" style={{ marginBottom: "1.5rem" }}>
            {t("story.title")}
          </h2>
          <div className="space-y-5 landing-body-md" style={{ maxWidth: "65ch" }}>
            <p>{t("story.p1")}</p>
            <p>{t("story.p2")}</p>
            <p>{t("story.p3")}</p>
          </div>
        </div>
      </section>

      {/* ═══ Values ═══ */}
      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-heading-lg">{t("values.title")}</h2>
            <p
              className="landing-body-md"
              style={{ marginTop: 12, maxWidth: 480, marginInline: "auto" }}
            >
              {t("values.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div key={v.title} className="landing-feature-card" style={{ textAlign: "center" }}>
                <h3 className="landing-feature-title" style={{ fontSize: "1.2rem" }}>
                  {v.title}
                </h3>
                <p className="landing-body-md">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Team ═══ */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-heading-lg">{t("team.title")}</h2>
            <p
              className="landing-body-md"
              style={{ marginTop: 12, maxWidth: 480, marginInline: "auto" }}
            >
              {t("team.subtitle")}
            </p>
          </div>
          <div
            className="grid md:grid-cols-3 gap-8"
            style={{ maxWidth: 800, marginInline: "auto" }}
          >
            {team.map((member: TeamMember) => (
              <div
                key={member.name}
                className="landing-feature-card"
                style={{ textAlign: "center" }}
              >
                <div className="landing-format-icon" style={{ margin: "0 auto 1rem" }}>
                  <span
                    style={{ fontWeight: 700, fontSize: "1rem", color: "var(--landing-primary)" }}
                  >
                    {member.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </span>
                </div>
                <h3 className="landing-feature-title" style={{ fontSize: "1.1rem" }}>
                  {member.name}
                </h3>
                <p
                  className="landing-text-primary"
                  style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 8 }}
                >
                  {member.role}
                </p>
                <p className="landing-body-md">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <div className="landing-cta-section">
        <div className="landing-cta-inner landing-container-xs">
          <h2 className="landing-cta-title">{t("cta.title")}</h2>
          <p className="landing-cta-body">{t("cta.body")}</p>
          <Link href="/signup" className="landing-btn landing-btn-white landing-btn-xl">
            {t("cta.button")}
            <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
