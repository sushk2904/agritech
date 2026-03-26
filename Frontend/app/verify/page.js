"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Reveal } from "../../components/reveal";
import { useSiteState } from "../../components/site-state";
import { getErrorMessage, requestOtp, verifyOtp } from "../../lib/backend";

const CODE_LENGTH = 4;

function normalizeValue(value) {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

function focusInput(index) {
  const input = document.querySelector(`[data-code-input="${index}"]`);
  input?.focus();
}

function VerifyPageContent() {
  const router = useRouter();
  const { copy, setSession } = useSiteState();
  const { verify } = copy;
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow") === "signup" ? "signup" : "login";
  const contact = String(searchParams.get("contact") || verify.fallbackContact).trim().toLowerCase();
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const lead = flow === "signup" ? verify.leadSignup : verify.leadLogin;
  const isComplete = code.every(Boolean);

  const handleCodeChange = (index, rawValue) => {
    const value = normalizeValue(rawValue);

    setCode((currentCode) => {
      const nextCode = [...currentCode];

      if (value.length > 1) {
        value.split("").forEach((digit, valueIndex) => {
          const nextIndex = index + valueIndex;

          if (nextIndex < CODE_LENGTH) {
            nextCode[nextIndex] = digit;
          }
        });
      } else {
        nextCode[index] = value;
      }

      return nextCode;
    });

    if (value && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const value = normalizeValue(event.clipboardData.getData("text"));

    if (!value) {
      return;
    }

    setCode((currentCode) => {
      const nextCode = [...currentCode];

      value.split("").forEach((digit, index) => {
        nextCode[index] = digit;
      });

      return nextCode;
    });

    focusInput(Math.min(value.length, CODE_LENGTH - 1));
  };

  return (
    <main className="page-main page-shell">
      <Reveal className="auth-layout verify-layout">
        <section className="auth-panel">
          <p className="eyebrow">{verify.eyebrow}</p>
          <h1>{verify.title}</h1>
          <p className="page-lead">{lead}</p>

          <ul className="point-list">
            {verify.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="auth-card verify-card">
          <div className="card-copy">
            <h2>{verify.codeLabel}</h2>
            <p>
              {verify.contactLabel}: <strong>{contact}</strong>
            </p>
            <p className="field-note">The current backend sends a 4-digit OTP to the email address above.</p>
          </div>

          <form
            className="verify-form"
            onSubmit={async (event) => {
              event.preventDefault();

              if (!isComplete) {
                return;
              }

              setPending(true);
              setError("");
              setStatus("Verifying the email OTP and opening your JWT session.");

              try {
                const result = await verifyOtp(contact, code.join(""));
                setSession(result.session);
                setVerified(true);
                setStatus("Verification complete. Your workspace session is ready.");
              } catch (verifyError) {
                setVerified(false);
                setError(getErrorMessage(verifyError));
                setStatus("");
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="code-grid" aria-label={verify.codeLabel}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  data-code-input={index}
                  className="code-input"
                  aria-label={`${verify.codeLabel} ${index + 1}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  autoFocus={index === 0}
                  inputMode="numeric"
                  maxLength={1}
                  pattern="[0-9]*"
                  type="text"
                  value={digit}
                  onChange={(event) => handleCodeChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={index === 0 ? handlePaste : undefined}
                />
              ))}
            </div>

            <div className="verify-meta">
              <button type="submit" className="button button-primary" disabled={!isComplete || pending || resending}>
                {pending ? "Verifying..." : verify.submit}
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={pending || resending}
                onClick={async () => {
                  setResending(true);
                  setError("");
                  setStatus("Requesting a fresh OTP from the backend.");
                  setVerified(false);
                  setCode(Array(CODE_LENGTH).fill(""));
                  try {
                    await requestOtp(contact);
                    setStatus("A new OTP has been sent to your email.");
                    focusInput(0);
                  } catch (resendError) {
                    setStatus("");
                    setError(getErrorMessage(resendError));
                  } finally {
                    setResending(false);
                  }
                }}
              >
                {resending ? "Sending..." : verify.resend}
              </button>
            </div>
          </form>

          {status ? <p className="form-status form-status-neutral">{status}</p> : null}
          {error ? <p className="form-status form-status-error">{error}</p> : null}

          {verified ? (
            <div className="verify-success">
              <p className="form-result">{verify.success}</p>
              <button
                type="button"
                className="button button-primary button-block"
                onClick={() => {
                  router.push("/project");
                }}
              >
                {verify.continue}
              </button>
            </div>
          ) : null}

          <p className="helper-text">
            {verify.helper}{" "}
            <Link className="text-link" href={flow === "signup" ? "/signup" : "/login"}>
              {verify.helperCta}
            </Link>
          </p>
        </section>
      </Reveal>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageContent />
    </Suspense>
  );
}
