interface UseCase {
  title: string;
  description: string;
}

interface LandingUseCasesProps {
  title: string;
}

const USE_CASES: UseCase[] = [
  {
    title: "Weekly & monthly reporting",
    description:
      "Turn your recurring spreadsheets into clean, on-brand presentations in seconds — no PowerPoint formatting.",
  },
  {
    title: "Team meetings & sprint reviews",
    description:
      "Collaborate in real time and export to PPTX in one click, so your team spends time on decisions, not prep.",
  },
  {
    title: "Client & board presentations",
    description:
      "Adapt any dataset into a tailored deck for pitches, reviews, or committee meetings.",
  },
];

export function LandingUseCases({ title }: LandingUseCasesProps) {
  return (
    <section className="landing-section landing-section-alt">
      <div className="landing-container-sm">
        <div className="landing-section-header">
          <h2 className="landing-heading-lg">{title}</h2>
        </div>
        <div className="landing-testimonials-grid">
          {USE_CASES.map((useCase) => (
            <div key={useCase.title} className="landing-feature-card">
              <h3 className="landing-testimonial-name">{useCase.title}</h3>
              <p className="landing-testimonial-text">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
