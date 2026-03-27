"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useSiteState } from "../../components/site-state";
import { getErrorMessage, requestOtp, verifyOtp } from "../../lib/backend";

const CODE_LENGTH = 4;

const VERIFY_SURFACE = {
  en: {
    panelKicker: "Verification",
    panelTitle: "One last step before the claim card.",
    panelText: "This page now gives clearer context while keeping the OTP step short and focused.",
    points: [
      "Check the email inbox",
      "Enter the 4-digit code",
      "Continue to the claim workspace"
    ]
  },
  hi: {
    panelKicker: "Verification",
    panelTitle: "Claim card से पहले एक आखिरी step.",
    panelText: "यह page अब clearer context देता है, लेकिन OTP step अभी भी short और focused है.",
    points: [
      "Email inbox check करें",
      "4-digit code दर्ज करें",
      "Claim workspace में जाएं"
    ]
  }
};

function normalizeValue(value) {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

function focusInput(index) {
  const input = document.querySelector(`[data-code-input="${index}"]`);
  input?.focus();
}

function VerifyPageContent() {
  const router = useRouter();
  const { copy, language, setSession } = useSiteState();
  const { verify } = copy;
  const surface = VERIFY_SURFACE[language] || VERIFY_SURFACE.en;
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
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">{verify.eyebrow}</p>
          <h1>{verify.title}</h1>
          <p className="page-lead">{lead}</p>

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
            <h2>{verify.codeLabel}</h2>
            <p className="field-note">
              {verify.contactLabel}: <strong>{contact}</strong>
            </p>
            <p className="field-note">{verify.note}</p>
          </div>

          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault();

              if (!isComplete) {
                return;
              }

              setPending(true);
              setError("");
              setStatus(verify.verifyingStatus);

              try {
                const result = await verifyOtp(contact, code.join(""));
                setSession(result.session);
                setVerified(true);
                setStatus(verify.verifiedStatus);
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

            <div className="verify-actions">
              <button type="submit" className="button button-primary" disabled={!isComplete || pending || resending}>
                {pending ? verify.pendingLabel : verify.submit}
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={pending || resending}
                onClick={async () => {
                  setResending(true);
                  setError("");
                  setStatus("");
                  setVerified(false);
                  setCode(Array(CODE_LENGTH).fill(""));
                  try {
                    await requestOtp(contact);
                    setStatus(verify.resentStatus);
                    focusInput(0);
                  } catch (resendError) {
                    setError(getErrorMessage(resendError));
                  } finally {
                    setResending(false);
                  }
                }}
              >
                {resending ? verify.resendPendingLabel : verify.resend}
              </button>
            </div>
          </form>

          {status ? <p className="form-status form-status-neutral">{status}</p> : null}
          {error ? <p className="form-status form-status-error">{error}</p> : null}

          {verified ? (
            <button
              type="button"
              className="button button-primary button-block"
              onClick={() => {
                router.push("/project");
              }}
            >
              {verify.continue}
            </button>
          ) : null}

          <p className="helper-text">
            {verify.helper}{" "}
            <Link className="text-link" href={flow === "signup" ? "/signup" : "/login"}>
              {verify.helperCta}
            </Link>
          </p>
        </section>
      </section>
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
