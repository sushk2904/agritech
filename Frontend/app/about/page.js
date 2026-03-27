"use client";

import Link from "next/link";
import { useSiteState } from "../../components/site-state";

const ABOUT_SURFACE = {
  en: {
    panelKicker: "Design direction",
    panelTitle: "Useful content, not filler content.",
    panelText:
      "This version restores enough context to feel like a real product, but keeps the user journey small and readable.",
    panelPoints: [
      "Bilingual entry",
      "Short OTP access",
      "Focused claim workspace"
    ],
    sectionTitle: "What the redesign keeps",
    sectionLead:
      "The site now has stronger hierarchy, better spacing, and more deliberate support content without returning to the old clutter.",
    ctaTitle: "Open the main flow",
    ctaText: "Use the login flow first, then move into the claim workspace."
  },
  hi: {
    panelKicker: "Design direction",
    panelTitle: "Useful content, filler content नहीं।",
    panelText:
      "इस version में enough context वापस जोड़ा गया है ताकि यह real product लगे, लेकिन user journey अभी भी छोटी और readable रहे.",
    panelPoints: [
      "Bilingual entry",
      "Short OTP access",
      "Focused claim workspace"
    ],
    sectionTitle: "Redesign क्या रखता है",
    sectionLead:
      "Site में अब stronger hierarchy, better spacing, और deliberate support content है, बिना पुराने clutter को वापस लाए.",
    ctaTitle: "Main flow खोलें",
    ctaText: "पहले login flow use करें, फिर claim workspace में जाएं।"
  }
};

export default function AboutPage() {
  const { copy, language } = useSiteState();
  const { about } = copy;
  const surface = ABOUT_SURFACE[language] || ABOUT_SURFACE.en;

  return (
    <main className="page-main page-shell">
      <section className="hero-shell hero-shell-modern">
        <div className="hero-layout">
          <div className="hero-main">
            <p className="eyebrow">{about.eyebrow}</p>
            <h1>{about.title}</h1>
            <p className="page-lead">{about.lead}</p>
          </div>

          <aside className="hero-side-panel">
            <span className="panel-kicker">{surface.panelKicker}</span>
            <h2 className="panel-title">{surface.panelTitle}</h2>
            <p className="panel-copy">{surface.panelText}</p>

            <div className="panel-list">
              {surface.panelPoints.map((point, index) => (
                <div key={point} className="panel-item">
                  <span className="panel-number">{String(index + 1).padStart(2, "0")}</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="content-shell content-shell-modern">
        <div className="section-head">
          <h2>{surface.sectionTitle}</h2>
          <p className="section-copy">{surface.sectionLead}</p>
        </div>

        <div className="feature-grid">
          {about.items.map((item) => (
            <article key={item.title} className="info-card info-card-modern">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="support-band">
        <div>
          <h2>{surface.ctaTitle}</h2>
          <p className="section-copy">{surface.ctaText}</p>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/login">
            {copy.common.nav.login}
          </Link>
          <Link className="button button-secondary" href="/project">
            {copy.common.nav.project}
          </Link>
        </div>
      </section>
    </main>
  );
}
