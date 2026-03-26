"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Reveal } from "../../components/reveal";
import { useSiteState } from "../../components/site-state";
import {
  DEMO_HASHED_FARMER_ID,
  fetchFarmerPlot,
  fetchProfile,
  fetchPublicKey,
  getErrorMessage,
  submitClaimBundle,
  updateProfile
} from "../../lib/backend";
import { prepareSecureClaimBundle } from "../../lib/claim-crypto";

const DAMAGE_TYPES = [
  { value: "FLOOD", label: "Flood" },
  { value: "DROUGHT", label: "Drought" },
  { value: "PEST", label: "Pest" }
];

const PIPELINE_STATUS_LABELS = {
  IDLE: "Choose a damage type and upload field evidence to prepare a secure claim.",
  FETCHING_KEY: "Fetching the live RSA public key from the backend.",
  HASHING: "Hashing the uploaded image on the client.",
  GENERATING_PROOF: "Generating the local geofence proof bundle.",
  ENCRYPTING: "Encrypting the payload with AES and RSA-OAEP.",
  SUBMITTING: "Submitting the secure claim bundle to the backend.",
  SUCCESS: "The backend accepted the secure claim bundle.",
  ERROR: "The secure claim submission did not complete."
};

function shortenValue(value) {
  if (!value) {
    return "Not available";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function getPlotSummary(plot) {
  const firstRing = plot?.coordinates?.[0];
  const vertexCount = Array.isArray(firstRing) ? firstRing.length : 0;

  if (!vertexCount) {
    return "Live plot coordinates are not loaded yet.";
  }

  return `${plot.type || "Polygon"} received with ${vertexCount} geofence vertices from AgriStack.`;
}

function getUniqueCandidates(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

export default function ProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const { copy, isAuthenticated, session, setSession } = useSiteState();
  const { project } = copy;
  const [selectedDamageType, setSelectedDamageType] = useState("FLOOD");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState("IDLE");
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [claimResponse, setClaimResponse] = useState("");
  const [publicKeyBase64, setPublicKeyBase64] = useState("");
  const [plot, setPlot] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const hashedFarmerId = session?.hashedFarmerId || DEMO_HASHED_FARMER_ID;
  const plotSummary = useMemo(() => getPlotSummary(plot), [plot]);
  const displayName = profile?.fullName || session?.fullName || "Verified Farmer";
  const displayEmail = profile?.email || session?.email || "Not available";
  const displayWallet = profile?.walletAddress || session?.wallet || "";

  const refreshWorkspace = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingWorkspace(true);
    }

    const currentStatus = [];
    let nextError = "";
    let nextProfile = null;

    try {
      const nextPublicKey = await fetchPublicKey();
      setPublicKeyBase64(nextPublicKey);
      currentStatus.push("public key ready");
    } catch (error) {
      nextError = getErrorMessage(error);
      setPublicKeyBase64("");
    }

    if (isAuthenticated && session?.token) {
      try {
        nextProfile = await fetchProfile(session.token);
        setProfile(nextProfile);
        setProfileDraft((currentDraft) => currentDraft || nextProfile.fullName || "");
        currentStatus.push("profile loaded");

        setSession({
          ...session,
          farmerId: nextProfile.id || session.farmerId,
          fullName: nextProfile.fullName || session.fullName,
          email: nextProfile.email || session.email,
          wallet: nextProfile.walletAddress || session.wallet
        });
      } catch (error) {
        setProfile(null);
        nextError = nextError || getErrorMessage(error);
      }

      const plotCandidates = getUniqueCandidates([
        nextProfile?.id,
        session?.farmerId,
        session?.hashedFarmerId,
        DEMO_HASHED_FARMER_ID
      ]);

      let nextPlot = null;
      let plotCandidateUsed = "";
      let plotError = "";

      for (const candidate of plotCandidates) {
        try {
          nextPlot = await fetchFarmerPlot({
            token: session.token,
            hashedFarmerId: candidate
          });
          plotCandidateUsed = candidate;
          break;
        } catch (error) {
          plotError = plotError || getErrorMessage(error);
        }
      }

      if (nextPlot) {
        setPlot(nextPlot);
        currentStatus.push("plot loaded");

        if (plotCandidateUsed && plotCandidateUsed !== session?.hashedFarmerId) {
          setSession({
            ...session,
            farmerId: nextProfile?.id || session.farmerId,
            fullName: nextProfile?.fullName || session.fullName,
            email: nextProfile?.email || session.email,
            wallet: nextProfile?.walletAddress || session.wallet,
            hashedFarmerId: plotCandidateUsed
          });
        }
      } else {
        setPlot(null);
        nextError = nextError || plotError || "The farmer plot could not be loaded.";
      }
    } else {
      setProfile(null);
      setProfileDraft("");
      setPlot(null);
    }

    setWorkspaceError(nextError);

    if (nextError && !currentStatus.length) {
      setWorkspaceStatus("");
    } else if (currentStatus.length) {
      setWorkspaceStatus(`Backend workspace ready: ${currentStatus.join(", ")}.`);
    } else if (!isAuthenticated) {
      setWorkspaceStatus("Sign in to load the farmer profile, plot, and secure claim flow.");
    }

    if (!silent) {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    refreshWorkspace({ silent: false });
  }, [isAuthenticated, session?.token, hashedFarmerId]);

  const intakeStages = [
    {
      title: project.intakeStages[0].title,
      text: isAuthenticated
        ? `JWT session active for ${displayName} (${displayEmail}).`
        : "Sign in with email OTP to attach a live backend session."
    },
    {
      title: project.intakeStages[1].title,
      text: publicKeyBase64
        ? plot
          ? "Public key, farmer profile, and plot are all live, so secure claim packaging can start."
          : "Public key is live. Profile and plot loading continue after sign-in."
        : "Waiting for the backend public key before secure packaging can begin."
    },
    {
      title: project.intakeStages[2].title,
      text:
        claimResponse ||
        workspaceError ||
        workspaceStatus ||
        PIPELINE_STATUS_LABELS[pipelineStatus] ||
        project.intakeStages[2].text
    }
  ];

  const activity = [
    {
      title: project.activity[0].title,
      text: isAuthenticated
        ? `Signed in as ${displayName} with wallet ${shortenValue(displayWallet)}.`
        : "No live session yet. Login will request an OTP from the backend."
    },
    {
      title: project.activity[1].title,
      text: isAuthenticated ? plotSummary : "Sign in to fetch live plot coordinates from AgriStack."
    },
    {
      title: project.activity[2].title,
      text: claimResponse || PIPELINE_STATUS_LABELS[pipelineStatus] || project.activity[2].text
    }
  ];

  const notices = [
    {
      title: project.notices[0].title,
      text: claimResponse || "A localized confirmation will appear here after a successful secure submit."
    },
    {
      title: project.notices[1].title,
      text: publicKeyBase64
        ? "RSA public key fetched successfully, and the claim bundle will be encrypted on the client."
        : "The secure verification layer is waiting for the backend public key."
    },
    {
      title: project.notices[2].title,
      text: profile
        ? `Profile endpoint live for ${profile.fullName || "the current farmer"}.`
        : "Profile visibility appears after OTP verification succeeds."
    }
  ];

  const backendDetails = [
    {
      title: project.backendDetails[0].title,
      text: isAuthenticated
        ? `JWT live. Farmer id ${shortenValue(profile?.id || session?.farmerId)} is stored in the frontend session.`
        : "Email OTP session is not established yet."
    },
    {
      title: project.backendDetails[1].title,
      text: selectedFileName
        ? `Ready to submit ${selectedDamageType.toLowerCase()} evidence from ${selectedFileName}.`
        : "Choose a field image to create and submit a secure claim bundle."
    },
    {
      title: project.backendDetails[2].title,
      text: publicKeyBase64
        ? "The proof bundle will be generated locally with the repo ZKP artifacts before submission."
        : "Proof packaging is blocked until the backend public key is available."
    },
    {
      title: project.backendDetails[3].title,
      text: profile
        ? "Profile read and update are also live on the latest backend."
        : "Submission, geofence, and wallet feedback continue to flow through this same UI."
    }
  ];

  const payoutMetrics = [
    {
      value: pipelineStatus === "SUCCESS" ? "Sent" : isAuthenticated ? "Live" : "Locked",
      label: project.payoutMetrics[0].label
    },
    {
      value: plot ? "1" : "0",
      label: project.payoutMetrics[1].label
    },
    {
      value: profile ? "Live" : "Pending",
      label: project.payoutMetrics[2].label
    }
  ];

  const heroStats = isAuthenticated
    ? [
        { value: "Live", label: project.stats[0].label },
        { value: profile ? "Profile" : "Auth", label: project.stats[1].label },
        { value: publicKeyBase64 ? "Connected" : "Pending", label: project.stats[2].label }
      ]
    : project.stats;

  const handleClaimButtonClick = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setPipelineStatus("IDLE");
    setClaimResponse("");
    setWorkspaceError("");

    try {
      let activePublicKey = publicKeyBase64;

      if (!activePublicKey) {
        setPipelineStatus("FETCHING_KEY");
        activePublicKey = await fetchPublicKey();
        setPublicKeyBase64(activePublicKey);
      }

      const bundle = await prepareSecureClaimBundle({
        file,
        damageType: selectedDamageType,
        hashedFarmerId,
        publicKeyBase64: activePublicKey,
        onStageChange: setPipelineStatus
      });

      setPipelineStatus("SUBMITTING");
      const responseText = await submitClaimBundle(bundle, session?.token);
      setClaimResponse(responseText);
      setPipelineStatus("SUCCESS");
      setWorkspaceStatus("Secure claim flow completed against the backend.");
    } catch (error) {
      setPipelineStatus("ERROR");
      setWorkspaceError(getErrorMessage(error));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const nextName = profileDraft.trim();

    if (!nextName || !session?.token) {
      setProfileError("Enter a display name and keep the session active before saving.");
      setProfileStatus("");
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileStatus("Saving the latest farmer name to the backend profile.");

    try {
      const result = await updateProfile(nextName, session);
      setSession(result.session);

      const nextProfile = await fetchProfile(result.session.token);
      setProfile(nextProfile);
      setProfileDraft(nextProfile.fullName || nextName);
      setSession({
        ...result.session,
        farmerId: nextProfile.id || result.session.farmerId,
        fullName: nextProfile.fullName || result.session.fullName,
        email: nextProfile.email || result.session.email,
        wallet: nextProfile.walletAddress || result.session.wallet
      });

      setProfileStatus("Profile updated and the fresh JWT session has been saved.");
    } catch (error) {
      setProfileStatus("");
      setProfileError(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <main className="page-main page-shell">
      <Reveal className="page-hero project-hero">
        <div className="page-copy">
          <p className="eyebrow">{project.eyebrow}</p>
          <h1>{project.title}</h1>
          <p className="page-lead">{project.lead}</p>
        </div>

        <aside className="page-hero-card">
          <h2>{project.backendTitle}</h2>
          <p>{project.backendText}</p>
          <div className="stats-grid compact">
            {heroStats.map((stat) => (
              <article key={stat.label} className="stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </aside>
      </Reveal>

      <Reveal className="workspace-layout page-section">
        <aside className="workspace-column">
          <article className="workspace-card">
            <h2>{project.sidebarTitle}</h2>
            <p>{project.sidebarLead}</p>

            <ul className="point-list">
              {project.sidebarActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </article>
        </aside>

        <section className="workspace-column workspace-main">
          <article className="workspace-card large">
            <div className="workspace-header">
              <h2>{project.composerTitle}</h2>
              <span className="status-chip">{isAuthenticated ? project.composerChip : "Email OTP required"}</span>
            </div>
            <p>{project.composerText}</p>

            <div className="damage-selector" role="group" aria-label="Select damage type">
              {DAMAGE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`damage-toggle ${selectedDamageType === type.value ? "active" : ""}`}
                  onClick={() => setSelectedDamageType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="checkpoint-list">
              {project.composerSteps.map((step, index) => (
                <div key={step.title} className="checkpoint-item">
                  <span className="checkpoint-number">{index + 1}</span>
                  <div>
                    <p className="step-title">{step.title}</p>
                    <p className="step-text">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <input
              ref={fileInputRef}
              className="hidden-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
            />

            <p className="field-note">
              {selectedFileName
                ? `Selected evidence: ${selectedFileName}`
                : "Choose a field image to hash, prove, encrypt, and submit to the backend."}
            </p>
            <p className="form-status form-status-neutral">
              {PIPELINE_STATUS_LABELS[pipelineStatus] || PIPELINE_STATUS_LABELS.IDLE}
            </p>
            {workspaceError ? <p className="form-status form-status-error">{workspaceError}</p> : null}
            {claimResponse ? <p className="form-result">{claimResponse}</p> : null}

            <div className="hero-actions">
              <button type="button" className="button button-primary" onClick={handleClaimButtonClick}>
                {project.composerPrimary}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  refreshWorkspace({ silent: false });
                }}
                disabled={loadingWorkspace}
              >
                {loadingWorkspace ? "Refreshing..." : project.composerSecondary}
              </button>
            </div>
          </article>

          <article className="workspace-card">
            <div className="workspace-header">
              <h2>{project.mapTitle}</h2>
              <span className="map-chip">{plot ? "Live plot loaded" : project.mapChip || "Registered plot"}</span>
            </div>
            <p>{project.mapText}</p>

            <div className="map-surface workspace-map">
              <div className="map-grid" />
              <div className="map-zone map-zone-large" />
              <div className="map-zone map-zone-small" />
              <div className="map-point map-point-one" />
              <div className="map-point map-point-two" />
              <div className="map-panel">
                <h4>{plot ? "Live farmer plot loaded from AgriStack" : project.mapPanelTitle}</h4>
                <p>{plot ? plotSummary : project.mapPanelText}</p>
              </div>
            </div>
          </article>
        </section>

        <aside className="workspace-column">
          <article className="workspace-card">
            <div className="workspace-header">
              <h2>Farmer profile</h2>
              <span className="status-chip">{profile ? "Profile live" : "Session layer"}</span>
            </div>
            <p>The latest backend also exposes profile read and update endpoints for the authenticated farmer.</p>

            {isAuthenticated ? (
              <>
                <form className="form-grid" onSubmit={handleProfileSubmit}>
                  <label className="field">
                    <span>Display name</span>
                    <input
                      type="text"
                      value={profileDraft}
                      onChange={(event) => setProfileDraft(event.target.value)}
                      placeholder="Verified Farmer"
                    />
                  </label>

                  <button type="submit" className="button button-primary button-block" disabled={savingProfile}>
                    {savingProfile ? "Saving profile..." : "Update profile name"}
                  </button>
                </form>

                {profileStatus ? <p className="form-status form-status-neutral">{profileStatus}</p> : null}
                {profileError ? <p className="form-status form-status-error">{profileError}</p> : null}

                <div className="stack-list">
                  <div className="signal-row">
                    <strong>Email</strong>
                    <p>{displayEmail}</p>
                  </div>
                  <div className="signal-row">
                    <strong>Wallet</strong>
                    <p>{displayWallet ? shortenValue(displayWallet) : "Waiting for profile data."}</p>
                  </div>
                  <div className="signal-row">
                    <strong>Farmer ID</strong>
                    <p>{shortenValue(profile?.id || session?.farmerId)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="field-note">Sign in first to load the latest backend profile data.</p>
            )}
          </article>

          <article className="workspace-card">
            <h2>{project.intakeTitle}</h2>
            <p>{project.intakeText}</p>

            <div className="intake-rail">
              {intakeStages.map((item) => (
                <div key={item.title} className="intake-step">
                  <div className="intake-step-bar" aria-hidden="true" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="workspace-card">
            <h2>{project.activityTitle}</h2>
            <div className="stack-list">
              {activity.map((item) => (
                <div key={item.title} className="signal-row">
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="workspace-card">
            <h2>{project.noticesTitle}</h2>
            <div className="stack-list">
              {notices.map((item) => (
                <div key={item.title} className="notice-item">
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </Reveal>

      <Reveal className="support-grid page-section">
        <article className="workspace-card">
          <h2>{project.backendTitle}</h2>
          <p>{project.backendText}</p>

          <div className="detail-grid">
            {backendDetails.map((item) => (
              <div key={item.title} className="insight-item">
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-card">
          <h2>{project.payoutTitle}</h2>
          <p>{project.payoutText}</p>

          <div className="stats-grid compact">
            {payoutMetrics.map((item) => (
              <article key={item.label} className="stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </article>
      </Reveal>
    </main>
  );
}
