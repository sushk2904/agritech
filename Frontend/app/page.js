"use client";

import Link from "next/link";
import { HeroScene } from "../components/hero-scene";
import { Reveal } from "../components/reveal";
import { useSiteState } from "../components/site-state";

export default function HomePage() {
  const { copy } = useSiteState();
  const { home } = copy;

  return (
    <main className="home-main">
      <section className="hero page-shell">
        <div className="hero-copy">
          <p className="eyebrow">{home.eyebrow}</p>
          <h1>{home.title}</h1>
          <p className="hero-lead">{home.lead}</p>

          <div className="hero-actions">
            <Link className="button button-primary" href="/project">
              {home.primaryCta}
            </Link>
            <Link className="button button-secondary" href="/signup">
              {home.secondaryCta}
            </Link>
          </div>

          <div className="metric-grid" aria-label="Key metrics">
            {home.metrics.map((metric) => (
              <article key={metric.label} className="metric-card">
                <span className="metric-value">{metric.value}</span>
                <span className="metric-label">{metric.label}</span>
              </article>
            ))}
          </div>
        </div>

        <HeroScene scene={home.scene} />
      </section>

      <Reveal className="panel-section page-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{home.trust.kicker}</p>
            <h2>{home.trust.title}</h2>
          </div>
        </div>

        <div className="feature-grid">
          {home.trust.items.map((item) => (
            <article key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal className="panel-section page-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{home.journey.kicker}</p>
            <h2>{home.journey.title}</h2>
          </div>
        </div>

        <div className="experience-grid">
          <article className="phone-card">
            <div className="phone-header">
              <span className="status-dot" />
              <span>{home.journey.badge}</span>
            </div>

            <div className="phone-screen">
              <h3>{home.journey.phoneTitle}</h3>
              <p className="phone-copy">{home.journey.phoneText}</p>

              <div className="step-list">
                {home.journey.steps.map((step, index) => (
                  <div key={step.title} className="step-item">
                    <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="step-title">{step.title}</p>
                      <p className="step-text">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="map-card">
            <div className="map-head">
              <div>
                <p className="map-kicker">{home.journey.mapKicker}</p>
                <h3>{home.journey.mapTitle}</h3>
              </div>
              <span className="map-chip">{home.journey.mapChip}</span>
            </div>

            <div className="map-surface">
              <div className="map-grid" />
              <div className="map-zone map-zone-large" />
              <div className="map-zone map-zone-small" />
              <div className="map-point map-point-one" />
              <div className="map-point map-point-two" />

              <div className="map-panel">
                <h4>{home.journey.mapPanelTitle}</h4>
                <p>{home.journey.mapPanelText}</p>
              </div>
            </div>
          </article>
        </div>
      </Reveal>

      <Reveal className="panel-section page-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{home.control.kicker}</p>
            <h2>{home.control.title}</h2>
          </div>
        </div>

        <div className="control-grid">
          <article className="admin-card">
            <h3>{home.control.timelineTitle || "Live timeline"}</h3>
            <div className="timeline">
              {home.control.timeline.map((item, index) => (
                <div key={item} className="timeline-item">
                  <span className="timeline-time">{`0${index + 1}`}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <h3>{home.control.bridgeTitle || "Integration points"}</h3>
            <ul className="bridge-list">
              {home.control.bridge.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </Reveal>

      <Reveal className="showcase-section page-shell">
        <section className="surface-card showcase-copy">
          <p className="section-kicker">{home.showcase.kicker}</p>
          <h2>{home.showcase.title}</h2>
          <p className="page-lead showcase-lead">{home.showcase.lead}</p>

          <div className="hero-actions">
            <Link className="button button-primary" href="/project">
              {home.showcase.primaryAction}
            </Link>
            <Link className="button button-secondary" href="/login">
              {home.showcase.secondaryAction}
            </Link>
          </div>
        </section>

        <section className="showcase-board">
          <article className="workspace-card showcase-primary">
            <p className="scene-kicker">{home.showcase.boardKicker}</p>
            <h3>{home.showcase.boardTitle}</h3>

            <div className="showcase-step-list">
              {home.showcase.steps.map((step, index) => (
                <div key={step.title} className="showcase-step">
                  <span className="showcase-step-number">{`0${index + 1}`}</span>
                  <div>
                    <p className="step-title">{step.title}</p>
                    <p className="step-text">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="showcase-stat-grid">
            {home.showcase.stats.map((item) => (
              <article key={item.label} className="stat-card showcase-stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
