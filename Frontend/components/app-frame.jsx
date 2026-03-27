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
  const visibleNavItems = isAuthenticated
    ? NAV_ITEMS.filter((item) => item.href === "/" || item.href === "/project")
    : NAV_ITEMS;
  const sessionLabel = session?.fullName || session?.email || "Session active";
  const sessionTitle = session?.fullName && session?.email ? `${session.fullName} (${session.email})` : sessionLabel;

  return (
    <>
      <div className="page-noise" aria-hidden="true" />
      <div className="page-halo page-halo-left" aria-hidden="true" />
      <div className="page-halo page-halo-right" aria-hidden="true" />

      <header className="topbar page-shell">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" aria-hidden="true">
            <img className="brand-logo" src="/agritech-logo-mark.svg" alt="" />
          </span>
          <span>
            <strong className="brand-name">AgriTech</strong>
            <span className="brand-caption">{copy.common.brandCaption}</span>
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
          {isAuthenticated ? (
            <div className="session-chip" title={sessionTitle}>
              <span className="session-dot" aria-hidden="true" />
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
                Logout
              </button>
            </div>
          ) : null}

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
        </div>
      </header>

      {children}

      <footer className="footer page-shell">
        <p>{copy.common.footerText}</p>
      </footer>
    </>
  );
}
