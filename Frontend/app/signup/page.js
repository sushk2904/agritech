"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSiteState } from "../../components/site-state";
import { getErrorMessage, isValidEmail, requestOtp } from "../../lib/backend";

const SIGNUP_SURFACE = {
  en: {
    panelKicker: "Onboarding",
    panelTitle: "Create access without extra friction.",
    panelText: "This screen now feels more complete while still keeping the signup path short and direct.",
    points: [
      "Name, email, language",
      "OTP verification next",
      "Claim workflow opens after setup"
    ]
  },
  hi: {
    panelKicker: "Onboarding",
    panelTitle: "Extra friction के बिना access बनाएं।",
    panelText: "यह screen अब ज्यादा complete लगती है, लेकिन signup path अभी भी short और direct है.",
    points: [
      "नाम, email, language",
      "अगला step OTP verification",
      "Setup के बाद claim workflow खुलता है"
    ]
  }
};

export default function SignupPage() {
  const router = useRouter();
  const { copy, language, setLanguage } = useSiteState();
  const { signup } = copy;
  const surface = SIGNUP_SURFACE[language] || SIGNUP_SURFACE.en;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("name") || "").trim();
    const contact = String(formData.get("contact") || "").trim().toLowerCase();
    const preferredLanguage = String(formData.get("language") || "en");

    if (!fullName) {
      setError(signup.nameError);
      setStatus("");
      return;
    }

    if (!isValidEmail(contact)) {
      setError(signup.emailError);
      setStatus("");
      return;
    }

    setPending(true);
    setError("");
    setStatus(signup.sendingStatus);

    try {
      if (preferredLanguage === "en" || preferredLanguage === "hi") {
        setLanguage(preferredLanguage);
      }

      await requestOtp(contact, fullName);
      router.push(`/verify?flow=signup&contact=${encodeURIComponent(contact)}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setStatus("");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="page-main page-shell">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">{signup.eyebrow}</p>
          <h1>{signup.title}</h1>
          <p className="page-lead">{signup.lead}</p>

          <div className="auth-side-panel">
            <span className="panel-kicker">{surface.panelKicker}</span>
            <h2 className="panel-title">{surface.panelTitle}</h2>
            <p className="panel-copy">{surface.panelText}</p>

            <div className="auth-support-grid">
              {surface.points.map((point) => (
                <article key={point} className="mini-card">
                  <p>{point}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <section className="auth-card auth-card-modern">
          <div className="card-copy">
            <h2>{signup.cardTitle}</h2>
            <p className="field-note">{signup.note}</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>{signup.fields.name}</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder={signup.fields.namePlaceholder}
                required
              />
            </label>

            <label className="field">
              <span>{signup.fields.contact}</span>
              <input
                name="contact"
                type="email"
                autoComplete="email"
                placeholder={signup.fields.contactPlaceholder}
                required
              />
            </label>

            <label className="field">
              <span>{signup.fields.language}</span>
              <select name="language" defaultValue="en">
                <option value="en">{signup.fields.languages.en}</option>
                <option value="hi">{signup.fields.languages.hi}</option>
              </select>
            </label>

            <button type="submit" className="button button-primary button-block" disabled={pending}>
              {pending ? signup.pendingLabel : signup.submit}
            </button>
          </form>

          {status ? <p className="form-status form-status-neutral">{status}</p> : null}
          {error ? <p className="form-status form-status-error">{error}</p> : null}

          <p className="helper-text">
            {signup.helper}{" "}
            <Link className="text-link" href="/login">
              {signup.helperCta}
            </Link>
          </p>
        </section>
      </section>
    </main>
  );
}
