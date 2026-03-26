"use client";

import { useEffect, useRef, useState } from "react";

export function Reveal({ as: Tag = "section", className = "", children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const applyPointerState = (x, y, glowX, glowY) => {
      node.style.setProperty("--section-pointer-x", x.toFixed(3));
      node.style.setProperty("--section-pointer-y", y.toFixed(3));
      node.style.setProperty("--section-pointer-glow-x", glowX);
      node.style.setProperty("--section-pointer-glow-y", glowY);
    };

    if (mediaQuery.matches) {
      setVisible(true);
      node.style.setProperty("--section-progress", "0.5");
      node.style.setProperty("--section-drift", "0");
      node.style.setProperty("--section-focus", "0.5");
      applyPointerState(0, 0, "50%", "50%");
      return undefined;
    }

    let depthFrame = 0;
    let pointerFrame = 0;
    let pointerState = {
      x: 0,
      y: 0,
      glowX: "50%",
      glowY: "50%"
    };

    const updateDepth = () => {
      depthFrame = 0;

      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const travel = viewportHeight + rect.height;
      const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / Math.max(travel, 1)));
      const drift = 0.5 - progress;
      const focus = 1 - Math.min(Math.abs(drift) * 2, 1);

      node.style.setProperty("--section-progress", progress.toFixed(3));
      node.style.setProperty("--section-drift", drift.toFixed(3));
      node.style.setProperty("--section-focus", focus.toFixed(3));
    };

    const requestDepthUpdate = () => {
      if (!depthFrame) {
        depthFrame = window.requestAnimationFrame(updateDepth);
      }
    };

    const updatePointer = () => {
      pointerFrame = 0;
      applyPointerState(pointerState.x, pointerState.y, pointerState.glowX, pointerState.glowY);
    };

    const requestPointerUpdate = () => {
      if (!pointerFrame) {
        pointerFrame = window.requestAnimationFrame(updatePointer);
      }
    };

    const handlePointerMove = (event) => {
      const rect = node.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      pointerState = {
        x: (x - 0.5) * 2,
        y: (y - 0.5) * 2,
        glowX: `${(x * 100).toFixed(1)}%`,
        glowY: `${(y * 100).toFixed(1)}%`
      };

      requestPointerUpdate();
    };

    const handlePointerLeave = () => {
      pointerState = {
        x: 0,
        y: 0,
        glowX: "50%",
        glowY: "50%"
      };

      requestPointerUpdate();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          setVisible(true);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    observer.observe(node);
    updateDepth();
    updatePointer();
    window.addEventListener("scroll", requestDepthUpdate, { passive: true });
    window.addEventListener("resize", requestDepthUpdate);
    node.addEventListener("pointermove", handlePointerMove);
    node.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (depthFrame) {
        window.cancelAnimationFrame(depthFrame);
      }

      if (pointerFrame) {
        window.cancelAnimationFrame(pointerFrame);
      }

      observer.disconnect();
      window.removeEventListener("scroll", requestDepthUpdate);
      window.removeEventListener("resize", requestDepthUpdate);
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
