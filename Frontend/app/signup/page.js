"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reveal } from "../../components/reveal";
import { useSiteState } from "../../components/site-state";
import { getErrorMessage, isValidEmail, requestOtp } from "../../lib/backend";

export default function SignupPage() {
  const router = useRouter();
  const { copy, setLanguage } = useSiteState();
  const { signup } = copy;
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
      setError("Please enter the farmer's full name before requesting the OTP.");
      setStatus("");
      return;
    }

    if (!isValidEmail(contact)) {
      setError("The current backend sends OTP only to email addresses.");
      setStatus("");
      return;
    }

    setPending(true);
    setError("");
    setStatus("Creating or locating the account, then sending an email OTP.");

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
      <Reveal className="auth-layout">
        <section className="auth-panel">
          <p className="eyebrow">{signup.eyebrow}</p>
          <h1>{signup.title}</h1>
          <p className="page-lead">{signup.lead}</p>

          <ul className="point-list">
            {signup.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="auth-card">
          <div className="card-copy">
            <h2>{signup.cardTitle}</h2>
            <p>{signup.cardLead}</p>
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
              {pending ? "Sending code..." : signup.submit}
            </button>
          </form>

          <p className="field-note">This backend auto-creates the farmer account after email OTP verification.</p>
          {status ? <p className="form-status form-status-neutral">{status}</p> : null}
          {error ? <p className="form-status form-status-error">{error}</p> : null}

          <p className="helper-text">
            {signup.helper}{" "}
            <Link className="text-link" href="/login">
              {signup.helperCta}
            </Link>
          </p>
        </section>
      </Reveal>
    </main>
  );
}
