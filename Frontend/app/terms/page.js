"use client";

import { useSiteState } from "../../components/site-state";

const TERMS_COPY = {
  en: {
    eyebrow: "Support",
    title: "Terms of service",
    lead: "Use AgriTech only for crop claim access, account verification, and claim submission.",
    points: [
      "Provide correct account and crop claim information.",
      "Use the service only for lawful insurance-related activity.",
      "Keep your session and OTP access private."
    ]
  },
  hi: {
    eyebrow: "सहायता",
    title: "सेवा की शर्तें",
    lead: "AgriTech का उपयोग केवल crop claim access, account verification, और claim submission के लिए करें।",
    points: [
      "सही account और crop claim जानकारी दें।",
      "सेवा का उपयोग केवल वैध insurance activity के लिए करें।",
      "अपना session और OTP access निजी रखें।"
    ]
  }
};

export default function TermsPage() {
  const { language } = useSiteState();
  const text = TERMS_COPY[language] || TERMS_COPY.en;

  return (
    <main className="page-main page-shell">
      <section className="hero-shell">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="page-lead">{text.lead}</p>
      </section>

      <section className="content-shell">
        <div className="card-grid">
          {text.points.map((point) => (
            <article key={point} className="info-card">
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
