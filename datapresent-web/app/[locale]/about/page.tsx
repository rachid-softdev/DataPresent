import { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
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

const TEAM: Record<string, { fr: TeamMember[]; en: TeamMember[] }> = {
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
    <div className="min-h-screen bg-background">
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden py-24 md:py-32 px-6 border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {t("badge")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {t("title")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* ═══ Story ═══ */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">{t("story.title")}</h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>{t("story.p1")}</p>
            <p>{t("story.p2")}</p>
            <p>{t("story.p3")}</p>
          </div>
        </div>
      </section>

      {/* ═══ Values ═══ */}
      <section className="py-20 md:py-28 px-6 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">{t("values.title")}</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
            {t("values.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-card border border-border rounded-2xl p-8 text-center"
              >
                <h3 className="text-2xl font-bold mb-3">{v.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Team ═══ */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">{t("team.title")}</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
            {t("team.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member: TeamMember) => (
              <div key={member.name} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-4 mx-auto">
                  {member.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </div>
                <h3 className="text-lg font-bold text-center mb-1">{member.name}</h3>
                <p className="text-sm text-primary font-medium text-center mb-3">{member.role}</p>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">{t("cta.body")}</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-4 rounded-xl hover:bg-white/90 transition-all"
          >
            {t("cta.button")}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
