interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  content: string;
  result: string;
}

interface LandingTestimonialsProps {
  title: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Sophie Martin",
    role: "Consultante en stratégie",
    avatar: "SM",
    content:
      "DataPresent me fait gagner des heures sur chaque rapport client. Je glisse mon Excel, je choisis un template, et en 30 secondes j'ai une présentation prête à présenter.",
    result: "15h/semaine → 2h/semaine",
  },
  {
    name: "Thomas Dubois",
    role: "Data Analyst",
    avatar: "TD",
    content:
      "Je génère mes reporting hebdomadaires en un clic. Les graphiques sont pertinents, la mise en page est propre. Je n'ouvre plus PowerPoint.",
    result: "Reporting en 30s au lieu de 3h",
  },
  {
    name: "Camille Bernard",
    role: "Cheffe de produit",
    avatar: "CB",
    content:
      "On l'utilise en équipe pour les revues de sprint. La collaboration temps réel et l'export PPTX nous évitent des jours de préparation.",
    result: "3 jours → 1 matinée",
  },
];

export function LandingTestimonials({ title }: LandingTestimonialsProps) {
  return (
    <section className="landing-section landing-section-alt">
      <div className="landing-container-sm">
        <div className="landing-section-header">
          <h2 className="landing-heading-lg">{title}</h2>
        </div>
        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="landing-testimonial-card">
              <p className="landing-testimonial-text">&ldquo;{t.content}&rdquo;</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="landing-testimonial-name">{t.name}</div>
                  <div className="landing-testimonial-role">{t.role}</div>
                </div>
              </div>
              <div className="landing-testimonial-result">{t.result}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
