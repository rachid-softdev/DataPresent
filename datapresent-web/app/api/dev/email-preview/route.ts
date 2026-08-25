import { NextResponse } from "next/server";
import { getEmailTemplate, emailConfig } from "@/lib/email-templates";

const MAGIC_LINK_DATA = {
  title: "Connectez-vous \u00e0 DataPresent",
  subtitle: "Utilisez ce lien pour acc\u00e9der \u00e0 votre espace",
  actionUrl: "https://app.datapresent.com/api/auth/callback/email?token=dev-preview-token",
  actionLabel: "Se connecter",
  linkText: "Ou copiez et collez ce lien dans votre navigateur :",
  expiryMinutes: "15",
  infoLabel: "Info",
  securityNote:
    "Si vous n\u2019avez pas demand\u00e9 cette connexion, vous pouvez ignorer cet email en toute s\u00e9curit\u00e9.",
  footerText: "Cet email a \u00e9t\u00e9 envoy\u00e9 par DataPresent.",
};

const WELCOME_DATA = {
  emoji: "\ud83d\ude80",
  title: "Bienvenue sur DataPresent !",
  subtitle: "Transformez vos donn\u00e9es en pr\u00e9sentations professionnelles",
  creditsLabel: "Cr\u00e9dits offerts",
  creditsAmount: "5 rapports gratuits",
  feature1Icon: "\ud83d\udcc1",
  feature1Title: "Import de donn\u00e9es",
  feature1Desc: "Connectez vos sources de donn\u00e9es en quelques clics",
  feature2Icon: "\u2728",
  feature2Title: "G\u00e9n\u00e9ration IA",
  feature2Desc: "Laissez l\u2019IA cr\u00e9er vos diapositives",
  feature3Icon: "\ud83d\udcc4",
  feature3Title: "Export PDF",
  feature3Desc: "T\u00e9l\u00e9chargez vos pr\u00e9sentations en PDF",
  actionUrl: "https://app.datapresent.com/dashboard",
  actionLabel: "Commencer",
  linkText: "Ou copiez ce lien :",
  footerText: "Merci de votre inscription \u00e0 DataPresent !",
};

export async function GET() {
  // Dev only: return 404 in production
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const templates = [
    {
      name: "magic-link",
      subject: emailConfig.magicLink.subject,
      html: getEmailTemplate("magic-link", MAGIC_LINK_DATA),
    },
    {
      name: "welcome",
      subject: emailConfig.welcome.subject,
      html: getEmailTemplate("welcome", WELCOME_DATA),
    },
  ];

  return NextResponse.json({ templates });
}
