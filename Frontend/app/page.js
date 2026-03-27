"use client";

import Link from "next/link";
import { useSiteState } from "../components/site-state";

const HOME_SURFACE = {
  en: {
    chips: ["Hindi + English", "OTP access", "One image claim"],
    panelKicker: "Claim flow",
    panelTitle: "Modern, guided, and still easy to use.",
    panelText:
      "The homepage now keeps a clearer structure: faster actions up front, a simple explanation in the middle, and no extra dashboard noise.",
    panelSteps: [
      "Enter with email OTP",
      "Pick damage type",
      "Upload one image and track status"
    ],
    sectionLead:
      "Only the useful parts are kept here, but they now sit in a stronger layout so the site feels finished instead of empty.",
    supportTitle: "Ready to start?",
    supportText: "Open the claim workflow directly, or create a fresh account first.",
    supportPrimary: "Open login",
    supportSecondary: "Open claim"
  },
  hi: {
    chips: ["हिंदी + English", "OTP access", "एक image claim"],
    panelKicker: "Claim flow",
    panelTitle: "Modern, guided, और आसान उपयोग।",
    panelText:
      "Homepage अब ज्यादा साफ structured है: ऊपर fast actions, बीच में simple explanation, और बिना extra dashboard noise के.",
    panelSteps: [
      "Email OTP से प्रवेश",
      "Damage type चुनें",
      "एक image upload करें और status देखें"
    ],
    sectionLead:
      "यहां सिर्फ जरूरी हिस्से रखे गए हैं, लेकिन अब layout ज्यादा strong है ताकि site empty नहीं बल्कि properly designed लगे.",
    supportTitle: "शुरू करने के लिए तैयार?",
    supportText: "सीधे claim workflow खोलें, या पहले नया account बनाएं।",
    supportPrimary: "लॉगिन खोलें",
    supportSecondary: "क्लेम खोलें"
  }
};

export default function HomePage() {
  const { copy, language } = useSiteState();
  const { home } = copy;
  const surface = HOME_SURFACE[language] || HOME_SURFACE.en;

  return (
    <main className="page-main page-shell">
      <section className="hero-shell hero-shell-modern">
        <div className="hero-layout">
          <div className="hero-main">
            <p className="eyebrow">{home.eyebrow}</p>
            <h1>{home.title}</h1>
            <p className="page-lead">{home.lead}</p>

            <div className="hero-chip-row">
              {surface.chips.map((chip) => (
                <span key={chip} className="info-chip">
                  {chip}
                </span>
              ))}
            </div>

            <div className="hero-actions">
              <Link className="button button-primary" href="/project">
                {home.primaryCta}
              </Link>
              <Link className="button button-secondary" href="/signup">
                {home.secondaryCta}
              </Link>
            </div>
          </div>

          <aside className="hero-side-panel">
            <span className="panel-kicker">{surface.panelKicker}</span>
            <h2 className="panel-title">{surface.panelTitle}</h2>
            <p className="panel-copy">{surface.panelText}</p>

            <div className="panel-list">
              {surface.panelSteps.map((step, index) => (
                <div key={step} className="panel-item">
                  <span className="panel-number">{String(index + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="how-it-works" className="content-shell content-shell-modern">
        <div className="section-split">
          <div className="section-head">
            <h2>{home.stepsTitle}</h2>
            <p className="section-copy">{surface.sectionLead}</p>
          </div>
          <Link className="button button-secondary section-link-button" href="/about">
            {copy.common.nav.about}
          </Link>
        </div>

        <div className="feature-grid">
          {home.steps.map((item) => (
            <article key={item.title} className="info-card info-card-modern">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="support-band">
        <div>
          <h2>{surface.supportTitle}</h2>
          <p className="section-copy">{surface.supportText}</p>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/login">
            {surface.supportPrimary}
          </Link>
          <Link className="button button-secondary" href="/project">
            {surface.supportSecondary}
          </Link>
        </div>
      </section>
    </main>
  );
}
