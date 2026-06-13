interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Aucune carte bancaire n'est demandée. Vous bénéficiez de 3 rapports gratuits pour découvrir toutes les fonctionnalités de DataPresent, sans engagement ni limite de temps.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui, toutes vos données sont chiffrées au repos et en transit. Elles ne sont jamais partagées avec des tiers et restent strictement confidentielles. Nous utilisons un chiffrement AES-256 pour le stockage et TLS 1.3 pour les transferts.",
  },
  {
    q: "Puis-je exporter mes présentations ?",
    a: "Absolument. Vous pouvez exporter vos présentations aux formats PDF, PPTX (PowerPoint) et Word. Les exports conservent l'intégralité de la mise en page, des graphiques et des animations.",
  },
  {
    q: "En quoi DataPresent est différent de PowerPoint ?",
    a: "DataPresent génère automatiquement l'intégralité de votre présentation à partir de vos données : structure des slides, graphiques pertinents, mise en page professionnelle. Là où PowerPoint vous demande de tout construire manuellement, DataPresent livre un résultat prêt à présenter en moins de 30 secondes.",
  },
];

export function LandingFaq() {
  return (
    <section className="landing-faq-section" id="faq">
      {/* FAQPage JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
              },
            })),
          }),
        }}
      />
      <div className="landing-container-xs">
        <div className="landing-section-header">
          <h2 className="landing-heading-lg">Questions fréquentes</h2>
        </div>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="landing-faq-item">
              <summary>{item.q}</summary>
              <div className="landing-faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
