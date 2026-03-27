"use client";

export function Reveal({ as: Tag = "section", className = "", children }) {
  return <Tag className={className}>{children}</Tag>;
}
