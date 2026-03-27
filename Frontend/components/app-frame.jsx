"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSiteState } from "./site-state";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/project", key: "project" },
  { href: "/login", key: "login" },
  { href: "/signup", key: "signup" }
];

const FOOTER_CONTENT = {
  en: {
    quickLinksTitle: "Quick links",
    quickLinks: [
      { href: "/about", label: "About AgriTech" },
      { href: "/#how-it-works", label: "How it works" }
    ],
    supportTitle: "Support",
    supportLinks: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" }
    ],
    helpTitle: "Claim help",
    helpText: "Need OTP or claim guidance? Open the main workflow from here.",
    helpPrimaryGuest: "Open login",
    helpPrimarySignedIn: "Open claim",
    helpSecondary: "Read overview",
    rights: "All rights reserved."
  },
  hi: {
    quickLinksTitle: "त्वरित लिंक",
    quickLinks: [
      { href: "/about", label: "AgriTech के बारे में" },
      { href: "/#how-it-works", label: "कैसे काम करता है" }
    ],
    supportTitle: "सहायता",
    supportLinks: [
      { href: "/terms", label: "सेवा की शर्तें" },
      { href: "/privacy", label: "गोपनीयता नीति" }
    ],
    helpTitle: "क्लेम सहायता",
    helpText: "OTP या claim guidance चाहिए? यहां से main workflow खोलें।",
    helpPrimaryGuest: "लॉगिन खोलें",
    helpPrimarySignedIn: "क्लेम खोलें",
    helpSecondary: "जानकारी देखें",
    rights: "सभी अधिकार सुरक्षित।"
  }
};

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function AppFrame({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { copy, language, setLanguage, theme, toggleTheme, session, isAuthenticated, clearSession } =
    useSiteState();
  const themeLabel = theme === "dark" ? copy.common.theme.dark : copy.common.theme.light;
  const footerCopy = FOOTER_CONTENT[language] || FOOTER_CONTENT.en;
  const currentYear = new Date().getFullYear();
  const visibleNavItems = isAuthenticated
    ? NAV_ITEMS.filter((item) => item.href === "/" || item.href === "/project")
    : NAV_ITEMS;
  const sessionLabel = session?.fullName || session?.email || copy.common.sessionActive;

  return (
    <>
      <header className="topbar page-shell">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" aria-hidden="true">
            <img className="brand-logo" src="/agritech-logo-mark.svg" alt="" />
          </span>
          <span className="brand-copy">
            <strong className="brand-name">AgriTech</strong>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "is-active" : undefined}
            >
              {copy.common.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="toolbar">
          <div className="language-switch" role="group" aria-label={copy.common.languageLabel}>
            <button
              type="button"
              className={`lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={`lang-btn ${language === "hi" ? "active" : ""}`}
              onClick={() => setLanguage("hi")}
            >
              HI
            </button>
          </div>

          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            {themeLabel}
          </button>

          {isAuthenticated ? (
            <div className="session-chip" title={sessionLabel}>
              <span className="session-email">{sessionLabel}</span>
              <button
                type="button"
                className="session-action"
                onClick={() => {
                  clearSession();
                  if (pathname === "/project") {
                    router.push("/");
                  }
                }}
              >
                {copy.common.logout}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {children}

      <footer className="footer">
        <div className="footer-shell page-shell">
          <div className="footer-grid">
            <div className="footer-brand-block">
              <Link className="footer-brand" href="/">
                <span className="footer-brand-mark" aria-hidden="true">
                  <img className="brand-logo" src="/agritech-logo-mark.svg" alt="" />
                </span>
                <strong className="footer-brand-name">AgriTech</strong>
              </Link>
              <p className="footer-description">{copy.common.footerText}</p>
            </div>

            <div className="footer-column">
              <h2 className="footer-heading">{footerCopy.quickLinksTitle}</h2>
              <div className="footer-link-list">
                {footerCopy.quickLinks.map((item) => (
                  <Link key={item.href} className="footer-link" href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="footer-column">
              <h2 className="footer-heading">{footerCopy.supportTitle}</h2>
              <div className="footer-link-list">
                {footerCopy.supportLinks.map((item) => (
                  <Link key={item.href} className="footer-link" href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="footer-column">
              <h2 className="footer-heading">{footerCopy.helpTitle}</h2>
              <p className="footer-help-text">{footerCopy.helpText}</p>
              <div className="footer-help-actions">
                <Link className="footer-cta" href={isAuthenticated ? "/project" : "/login"}>
                  {isAuthenticated ? footerCopy.helpPrimarySignedIn : footerCopy.helpPrimaryGuest}
                </Link>
                <Link className="footer-link footer-link-strong" href="/about">
                  {footerCopy.helpSecondary}
                </Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>{`© ${currentYear} AgriTech. ${footerCopy.rights}`}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
