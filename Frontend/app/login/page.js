"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reveal } from "../../components/reveal";
import { useSiteState } from "../../components/site-state";
import { getErrorMessage, isValidEmail, requestOtp } from "../../lib/backend";

export default function LoginPage() {
  const router = useRouter();
  const { copy } = useSiteState();
  const { login } = copy;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const contact = String(formData.get("contact") || "").trim().toLowerCase();

    if (!isValidEmail(contact)) {
      setError("The current backend sends OTP only to email addresses.");
      setStatus("");
      return;
    }

    setPending(true);
    setError("");
    setStatus("Requesting a verification code from the backend.");

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
      <Reveal className="auth-layout">
        <section className="auth-panel">
          <p className="eyebrow">{login.eyebrow}</p>
          <h1>{login.title}</h1>
          <p className="page-lead">{login.lead}</p>

          <ul className="point-list">
            {login.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="auth-card">
          <div className="card-copy">
            <h2>{login.cardTitle}</h2>
            <p>{login.cardLead}</p>
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
              {pending ? "Sending code..." : login.submit}
            </button>
          </form>

          <p className="field-note">Email OTP is live on the current backend. Phone entry is not supported yet.</p>
          {status ? <p className="form-status form-status-neutral">{status}</p> : null}
          {error ? <p className="form-status form-status-error">{error}</p> : null}

          <p className="helper-text">
            {login.helper}{" "}
            <Link className="text-link" href="/signup">
              {login.helperCta}
            </Link>
          </p>
        </section>
      </Reveal>
    </main>
  );
}
