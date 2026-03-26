"use client";

import { useEffect, useRef } from "react";

const CARD_CLASS_NAMES = ["scene-card-top", "scene-card-right", "scene-card-bottom"];
const PILL_CLASS_NAMES = ["scene-pill-left", "scene-pill-right"];

export function HeroScene({ scene }) {
  const sceneRef = useRef(null);

  useEffect(() => {
    const sceneNode = sceneRef.current;
    const hero = sceneNode?.closest(".hero");

    if (!sceneNode || !hero || typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      hero.style.setProperty("--hero-progress", "0");
      hero.style.setProperty("--hero-drift", "0");
      hero.style.setProperty("--hero-focus", "0.5");
      hero.style.setProperty("--scene-rotate-x", "-12deg");
      hero.style.setProperty("--scene-rotate-y", "16deg");
      return undefined;
    }

    let frame = 0;

    const updateMotion = () => {
      frame = 0;

      const rect = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(rect.height * 0.92, 1)));
      const drift = 0.5 - progress;
      const focus = 1 - Math.min(Math.abs(drift) * 2, 1);

      hero.style.setProperty("--hero-progress", progress.toFixed(3));
      hero.style.setProperty("--hero-drift", drift.toFixed(3));
      hero.style.setProperty("--hero-focus", focus.toFixed(3));
      hero.style.setProperty("--scene-rotate-x", `${-12 + progress * 7}deg`);
      hero.style.setProperty("--scene-rotate-y", `${16 - progress * 8}deg`);
    };

    const requestUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateMotion);
      }
    };

    updateMotion();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <div className="hero-scene" ref={sceneRef} aria-hidden="true">
      <div className="scene-shell">
        <div className="scene-glow" />
        <div className="scene-grid" />

        <div className="terrain-stack">
          <div className="terrain-layer terrain-layer-back" />
          <div className="terrain-layer terrain-layer-mid" />
          <div className="terrain-layer terrain-layer-front" />
        </div>

        <div className="scene-column scene-column-left" />
        <div className="scene-column scene-column-right" />
        <div className="scene-orbit orbit-one" />
        <div className="scene-orbit orbit-two" />
        <div className="scene-particle particle-one" />
        <div className="scene-particle particle-two" />
        <div className="scene-particle particle-three" />

        <div className="scene-core">
          <div className="scene-ring scene-ring-large" />
          <div className="scene-ring scene-ring-small" />
          <div className="scene-orb" />
        </div>

        {scene.cards.map((card, index) => (
          <article key={card.title} className={`scene-card ${CARD_CLASS_NAMES[index]}`}>
            <p className="scene-kicker">{card.kicker}</p>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}

        {scene.pills.map((pill, index) => (
          <div key={pill} className={`scene-pill ${PILL_CLASS_NAMES[index]}`}>
            <span className="status-dot" />
            <span>{pill}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
