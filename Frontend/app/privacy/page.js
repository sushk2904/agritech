"use client";

import { useSiteState } from "../../components/site-state";

const PRIVACY_COPY = {
  en: {
    eyebrow: "Support",
    title: "Privacy policy",
    lead: "AgriTech keeps the UI minimal and uses claim details only for verification, submission, and claim progress.",
    points: [
      "Only required account and claim information should be submitted.",
      "Uploaded evidence is used for claim processing only.",
      "Language and theme preferences are stored locally in the browser."
    ]
  },
  hi: {
    eyebrow: "सहायता",
    title: "गोपनीयता नीति",
    lead: "AgriTech UI को minimal रखता है और claim details का उपयोग केवल verification, submission, और claim progress के लिए करता है।",
    points: [
      "केवल जरूरी account और claim जानकारी submit की जानी चाहिए।",
      "Uploaded evidence का उपयोग केवल claim processing के लिए होता है।",
      "Language और theme preferences browser में locally store होती हैं।"
    ]
  }
};

export default function PrivacyPage() {
  const { language } = useSiteState();
  const text = PRIVACY_COPY[language] || PRIVACY_COPY.en;

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
