"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSiteState } from "../../components/site-state";
import { getErrorMessage, isValidEmail, requestOtp } from "../../lib/backend";

const LOGIN_SURFACE = {
  en: {
    panelKicker: "Access",
    panelTitle: "Short login, clearer entry.",
    panelText: "The form stays compact, but the page now explains what happens next so it feels complete.",
    points: [
      "Email OTP only",
      "Hindi and English support",
      "Claim card opens after verification"
    ]
  },
  hi: {
    panelKicker: "Access",
    panelTitle: "Short login, clearer entry.",
    panelText: "Form compact है, लेकिन page अब next step भी बताता है ताकि यह complete feel हो.",
    points: [
      "सिर्फ email OTP",
      "Hindi और English support",
      "Verification के बाद claim card खुलता है"
    ]
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { copy, language } = useSiteState();
  const { login } = copy;
  const surface = LOGIN_SURFACE[language] || LOGIN_SURFACE.en;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const contact = String(formData.get("contact") || "").trim().toLowerCase();

    if (!isValidEmail(contact)) {
      setError(login.emailError);
      setStatus("");
      return;
    }

    setPending(true);
    setError("");
    setStatus(login.sendingStatus);

    try {
      await requestOtp(contact, "");
      router.push(`/verify?flow=login&contact=${encodeURIComponent(contact)}`);
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
          <p className="eyebrow">{login.eyebrow}</p>
          <h1>{login.title}</h1>
          <p className="page-lead">{login.lead}</p>

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
            <h2>{login.cardTitle}</h2>
            <p className="field-note">{login.note}</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>{login.fields.email}</span>
              <input
                name="contact"
                type="email"
                autoComplete="email"
                placeholder={login.fields.emailPlaceholder}
                required
              />
            </label>

            <button type="submit" className="button button-primary button-block" disabled={pending}>
              {pending ? login.pendingLabel : login.submit}
            </button>
          </form>

          {status ? <p className="form-status form-status-neutral">{status}</p> : null}
          {error ? <p className="form-status form-status-error">{error}</p> : null}

          <p className="helper-text">
            {login.helper}{" "}
            <Link className="text-link" href="/signup">
              {login.helperCta}
            </Link>
          </p>
        </section>
      </section>
    </main>
  );
}
