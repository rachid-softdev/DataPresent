interface LandingFormatsProps {
  title: string;
  id?: string;
}

const FORMATS = [
  {
    name: "Excel",
    ext: ".xlsx, .xls",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        color="var(--accent)"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    name: "CSV",
    ext: ".csv, .tsv",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        color="var(--accent)"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
  {
    name: "PDF",
    ext: ".pdf",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        color="var(--accent)"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    name: "Google Sheets",
    ext: "Connexion directe",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        color="var(--accent)"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-6" />
      </svg>
    ),
  },
];

export function LandingFormats({ title, id }: LandingFormatsProps) {
  return (
    <section id={id} className="landing-section landing-section-alt">
      <div className="landing-container-sm">
        <div className="landing-section-header">
          <h2 className="landing-heading-lg">{title}</h2>
        </div>
        <div className="landing-formats-grid">
          {FORMATS.map((fmt) => (
            <div key={fmt.name} className="landing-format-item">
              <div className="landing-format-icon">{fmt.icon}</div>
              <div>
                <div className="landing-format-name">{fmt.name}</div>
                <div className="landing-format-ext">{fmt.ext}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
