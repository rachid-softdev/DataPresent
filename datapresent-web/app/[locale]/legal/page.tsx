import { Metadata } from "next";
import { Link } from "@/i18n/routing";

interface LegalPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    fr: "Mentions légales - DataPresent",
    en: "Legal Notice - DataPresent",
  };

  return {
    title: titles[locale] || titles.fr,
    description: "Mentions légales de DataPresent",
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="app-heading app-heading-xl mb-8">
          {isFr ? "Mentions légales" : "Legal Notice"}
        </h1>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          {isFr ? (
            <>
              <section>
                <h2 className="text-lg font-semibold text-foreground">1. Éditeur</h2>
                <p>
                  <strong>DataPresent SAS</strong>
                  <br />
                  Société par actions simplifiée au capital de 10 000 €<br />
                  RCS Paris 904 321 678
                  <br />
                  Siège social : 128 Rue de Rivoli, 75001 Paris, France
                  <br />
                  Email : contact@datapresent.com
                  <br />
                  Tél. : +33 1 85 14 23 00
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">
                  2. Directeur de publication
                </h2>
                <p>Alexandre Renard, Président</p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">3. Hébergement</h2>
                <p>
                  DataPresent est hébergé par Vercel Inc.
                  <br />
                  340 S Lemon Ave #4133, Walnut, CA 91789, USA
                  <br />
                  Site web : vercel.com
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">
                  4. Propriété intellectuelle
                </h2>
                <p>
                  L&apos;ensemble du contenu de DataPresent (textes, graphismes, logos, icônes,
                  code) est protégé par le droit d&apos;auteur. Toute reproduction ou représentation
                  sans autorisation préalable est interdite.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">5. Protection des données</h2>
                <p>
                  Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification
                  et de suppression de vos données. Consultez notre{" "}
                  <Link href="/privacy" className="text-primary underline">
                    Politique de confidentialité
                  </Link>{" "}
                  pour en savoir plus.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-semibold text-foreground">1. Publisher</h2>
                <p>
                  <strong>DataPresent SAS</strong>
                  <br />
                  Simplified joint stock company with capital of €10,000
                  <br />
                  RCS Paris 904 321 678
                  <br />
                  Registered office: 128 Rue de Rivoli, 75001 Paris, France
                  <br />
                  Email: contact@datapresent.com
                  <br />
                  Tel: +33 1 85 14 23 00
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">2. Publishing Director</h2>
                <p>Alexandre Renard, President</p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">3. Hosting</h2>
                <p>
                  DataPresent is hosted by Vercel Inc.
                  <br />
                  340 S Lemon Ave #4133, Walnut, CA 91789, USA
                  <br />
                  Website: vercel.com
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">4. Intellectual Property</h2>
                <p>
                  All content on DataPresent (texts, graphics, logos, icons, code) is protected by
                  copyright. Any reproduction or representation without prior authorization is
                  prohibited.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-foreground">5. Data Protection</h2>
                <p>
                  In accordance with GDPR, you have the right to access, rectify and delete your
                  data. See our{" "}
                  <Link href="/privacy" className="text-primary underline">
                    Privacy Policy
                  </Link>{" "}
                  for more information.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
