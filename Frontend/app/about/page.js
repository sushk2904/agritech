"use client";

import Link from "next/link";
import { Reveal } from "../../components/reveal";
import { useSiteState } from "../../components/site-state";

export default function AboutPage() {
  const { copy } = useSiteState();
  const { about } = copy;

  return (
    <main className="page-main page-shell">
      <Reveal className="page-hero">
        <div className="page-copy">
          <p className="eyebrow">{about.eyebrow}</p>
          <h1>{about.title}</h1>
          <p className="page-lead">{about.lead}</p>

          <div className="hero-actions">
            <Link className="button button-primary" href="/project">
              {about.primaryCta}
            </Link>
            <Link className="button button-secondary" href="/signup">
              {about.secondaryCta}
            </Link>
          </div>
        </div>

        <aside className="page-hero-card">
          <h2>{about.principlesTitle}</h2>
          <div className="stats-grid">
            {about.stats.map((stat) => (
              <article key={stat.label} className="stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </aside>
      </Reveal>

      <Reveal className="panel-section page-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{about.principlesTitle}</p>
            <h2>{about.principlesLead}</h2>
          </div>
        </div>

        <div className="feature-grid">
          {about.principles.map((item) => (
            <article key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal className="panel-section page-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{about.stackTitle}</p>
            <h2>{about.stackLead}</h2>
          </div>
        </div>

        <div className="stack-grid">
          {about.stack.map((item) => (
            <article key={item.title} className="surface-card stack-card">
              <p className="scene-kicker">{item.kicker}</p>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </main>
  );
}
