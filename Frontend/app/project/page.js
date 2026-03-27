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
  submitClaimBundle
} from "../../lib/backend";
import { prepareSecureClaimBundle } from "../../lib/claim-crypto";

const DAMAGE_TYPES = {
  en: [
    { value: "FLOOD", label: "Flood" },
    { value: "DROUGHT", label: "Drought" },
    { value: "PEST", label: "Pest" }
  ],
  hi: [
    { value: "FLOOD", label: "बाढ़" },
    { value: "DROUGHT", label: "सूखा" },
    { value: "PEST", label: "कीट" }
  ]
};

const PIPELINE_STATUS_LABELS = {
  en: {
    IDLE: "Choose a damage type and attach one field image.",
    FETCHING_KEY: "Fetching the secure public key from the backend.",
    HASHING: "Hashing the selected image on the client.",
    GENERATING_PROOF: "Preparing the local geofence proof bundle.",
    ENCRYPTING: "Encrypting the payload in the browser.",
    SUBMITTING: "Submitting the secure claim bundle.",
    SUCCESS: "Secure claim submitted successfully.",
    ERROR: "Secure claim submission did not complete."
  },
  hi: {
    IDLE: "Damage type चुनें और एक field image जोड़ें।",
    FETCHING_KEY: "Backend से secure public key लाई जा रही है।",
    HASHING: "चुनी गई image client पर hash हो रही है।",
    GENERATING_PROOF: "Local geofence proof bundle तैयार हो रहा है।",
    ENCRYPTING: "Payload browser में encrypt हो रहा है।",
    SUBMITTING: "Secure claim bundle submit हो रहा है।",
    SUCCESS: "Secure claim सफलतापूर्वक submit हो गई।",
    ERROR: "Secure claim submission पूरा नहीं हुआ।"
  }
};

const PROJECT_UI_COPY = {
  en: {
    eyebrow: "Secure workspace",
    heroTitleAuthenticated: "Welcome back",
    heroLeadAuthenticated: "Only the core claim tools stay here now.",
    heroTitleGuest: "Sign in to open the secure claim workspace.",
    heroLeadGuest: "Email OTP unlocks the profile, plot lookup, and encrypted claim flow.",
    signedInAs: "Signed in as",
    summaryLabels: {
      access: "Access",
      plot: "Plot",
      security: "Security"
    },
    states: {
      live: "Live",
      ready: "Ready",
      pending: "Pending",
      locked: "Locked",
      otp: "OTP",
      sent: "Sent",
      sessionReady: "Session ready",
      signInRequired: "Sign in required",
      loading: "Loading"
    },
    flags: {
      publicKey: "public key ready",
      profile: "profile loaded",
      plot: "plot loaded"
    },
    workspaceReadyPrefix: "Workspace ready:",
    workspaceLocked: "Sign in to load the profile, plot, and secure claim tools.",
    claimTitle: "Submit claim",
    claimLead: "Choose one damage type, attach one image, and send the encrypted bundle.",
    selectedEvidence: "Selected evidence",
    noEvidence: "No file selected",
    plotStatus: "Plot status",
    plotPendingShort: "Waiting for plot",
    plotLoadedShort: "Plot loaded",
    latestStatus: "Latest status",
    uploadAction: "Upload evidence",
    loginAction: "Open login",
    refreshAction: "Refresh",
    refreshingAction: "Refreshing...",
    identityLabel: "Account",
    plotLabel: "Plot",
    securityLabel: "Security",
    plotUnavailable: "Live plot coordinates are not loaded yet.",
    vertexLabel: "vertices",
    polygonFallback: "Polygon"
  },
  hi: {
    eyebrow: "Secure workspace",
    heroTitleAuthenticated: "Welcome back",
    heroLeadAuthenticated: "अब यहां सिर्फ मुख्य claim tools रखे गए हैं।",
    heroTitleGuest: "Secure claim workspace खोलने के लिए sign in करें।",
    heroLeadGuest: "Email OTP से profile, plot lookup और encrypted claim flow खुलेगा।",
    signedInAs: "Signed in as",
    summaryLabels: {
      access: "Access",
      plot: "Plot",
      security: "Security"
    },
    states: {
      live: "Live",
      ready: "Ready",
      pending: "Pending",
      locked: "Locked",
      otp: "OTP",
      sent: "Sent",
      sessionReady: "Session ready",
      signInRequired: "Sign in required",
      loading: "Loading"
    },
    flags: {
      publicKey: "public key ready",
      profile: "profile loaded",
      plot: "plot loaded"
    },
    workspaceReadyPrefix: "Workspace ready:",
    workspaceLocked: "Profile, plot और secure claim tools देखने के लिए sign in करें।",
    claimTitle: "Claim submit करें",
    claimLead: "एक damage type चुनें, एक image जोड़ें, और encrypted bundle भेजें।",
    selectedEvidence: "Selected evidence",
    noEvidence: "कोई file selected नहीं है",
    plotStatus: "Plot status",
    plotPendingShort: "Plot pending",
    plotLoadedShort: "Plot loaded",
    latestStatus: "Latest status",
    uploadAction: "Evidence upload करें",
    loginAction: "Login खोलें",
    refreshAction: "Refresh",
    refreshingAction: "Refreshing...",
    identityLabel: "Account",
    plotLabel: "Plot",
    securityLabel: "Security",
    plotUnavailable: "Live plot coordinates अभी load नहीं हुई हैं।",
    vertexLabel: "vertices",
    polygonFallback: "Polygon"
  }
};

function getVertexCount(plot) {
  const firstRing = plot?.coordinates?.[0];
  return Array.isArray(firstRing) ? firstRing.length : 0;
}

function getPlotSummary(plot, text) {
  const vertexCount = getVertexCount(plot);

  if (!vertexCount) {
    return text.plotUnavailable;
  }

  return `${plot.type || text.polygonFallback} | ${vertexCount} ${text.vertexLabel}`;
}

function getUniqueCandidates(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

export default function ProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const { language, isAuthenticated, session, setSession } = useSiteState();
  const text = PROJECT_UI_COPY[language] || PROJECT_UI_COPY.en;
  const pipelineLabels = PIPELINE_STATUS_LABELS[language] || PIPELINE_STATUS_LABELS.en;
  const damageTypes = DAMAGE_TYPES[language] || DAMAGE_TYPES.en;

  const [selectedDamageType, setSelectedDamageType] = useState("FLOOD");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState("IDLE");
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [claimResponse, setClaimResponse] = useState("");
  const [publicKeyBase64, setPublicKeyBase64] = useState("");
  const [plot, setPlot] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const hashedFarmerId = session?.hashedFarmerId || DEMO_HASHED_FARMER_ID;
  const plotSummary = useMemo(() => getPlotSummary(plot, text), [plot, text]);
  const plotVertexCount = useMemo(() => getVertexCount(plot), [plot]);
  const displayName = profile?.fullName || session?.fullName || "Verified Farmer";
  const displayEmail = profile?.email || session?.email || "Not available";

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
      currentStatus.push(text.flags.publicKey);
    } catch (error) {
      nextError = getErrorMessage(error);
      setPublicKeyBase64("");
    }

    if (isAuthenticated && session?.token) {
      try {
        nextProfile = await fetchProfile(session.token);
        setProfile(nextProfile);
        currentStatus.push(text.flags.profile);

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
        currentStatus.push(text.flags.plot);

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
        nextError = nextError || plotError || text.plotUnavailable;
      }
    } else {
      setProfile(null);
      setPlot(null);
    }

    setWorkspaceError(nextError);

    if (nextError && !currentStatus.length) {
      setWorkspaceStatus("");
    } else if (currentStatus.length) {
      setWorkspaceStatus(`${text.workspaceReadyPrefix} ${currentStatus.join(", ")}.`);
    } else if (!isAuthenticated) {
      setWorkspaceStatus(text.workspaceLocked);
    }

    if (!silent) {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    refreshWorkspace({ silent: false });
  }, [isAuthenticated, session?.token, hashedFarmerId]);

  const latestStatus =
    claimResponse || workspaceError || workspaceStatus || pipelineLabels[pipelineStatus] || pipelineLabels.IDLE;

  const latestStatusClassName = claimResponse
    ? "form-result"
    : workspaceError
      ? "form-status form-status-error"
      : "form-status form-status-neutral";

  const summaryStats = [
    {
      label: text.summaryLabels.access,
      value: isAuthenticated ? text.states.live : text.states.otp
    },
    {
      label: text.summaryLabels.plot,
      value: plot ? text.states.ready : isAuthenticated ? text.states.pending : text.states.locked
    },
    {
      label: text.summaryLabels.security,
      value: publicKeyBase64 ? text.states.ready : isAuthenticated ? text.states.pending : text.states.locked
    }
  ];

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

  return (
    <main className="page-main page-shell">
      <Reveal className="project-minimal-shell">
        <section className="minimal-single-column">
          <article className="workspace-card minimal-primary-card">
            <div className="minimal-topline">
              <div className="minimal-copy">
                <p className="eyebrow">{text.eyebrow}</p>
                <h1>{isAuthenticated ? `${text.heroTitleAuthenticated}, ${displayName}` : text.heroTitleGuest}</h1>
                <p className="page-lead minimal-lead">
                  {isAuthenticated ? `${text.signedInAs} ${displayEmail}` : text.heroLeadGuest}
                </p>
              </div>

              <span className="status-chip">
                {isAuthenticated ? text.states.sessionReady : text.states.signInRequired}
              </span>
            </div>

            <div className="minimal-summary-strip" aria-label="Workspace summary">
              {summaryStats.map((item) => (
                <article key={item.label} className="minimal-summary-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="minimal-focus-strip">
              <div className="minimal-focus-item">
                <span>{text.identityLabel}</span>
                <strong>{displayName}</strong>
                <p>{displayEmail}</p>
              </div>
              <div className="minimal-focus-item">
                <span>{text.plotLabel}</span>
                <strong>{plot ? `${plotVertexCount} ${text.vertexLabel}` : text.plotPendingShort}</strong>
                <p>{plotSummary}</p>
              </div>
              <div className="minimal-focus-item">
                <span>{text.securityLabel}</span>
                <strong>{publicKeyBase64 ? text.states.ready : text.states.pending}</strong>
                <p>{claimResponse || pipelineLabels[pipelineStatus] || latestStatus}</p>
              </div>
            </div>

            <div className="damage-selector" role="group" aria-label="Select damage type">
              {damageTypes.map((type) => (
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

            <input
              ref={fileInputRef}
              className="hidden-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
            />

            <div className="minimal-evidence-grid">
              <div className="minimal-evidence-card">
                <span>{text.selectedEvidence}</span>
                <strong>{selectedFileName || text.noEvidence}</strong>
              </div>
            </div>

            <div className="hero-actions minimal-actions">
              <button type="button" className="button button-primary" onClick={handleClaimButtonClick}>
                {isAuthenticated ? text.uploadAction : text.loginAction}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  refreshWorkspace({ silent: false });
                }}
                disabled={loadingWorkspace}
              >
                {loadingWorkspace ? text.refreshingAction : text.refreshAction}
              </button>
            </div>

            <div className="minimal-status-panel">
              <span className="minimal-status-label">{text.claimTitle}</span>
              <p className={latestStatusClassName}>{latestStatus}</p>
            </div>
          </article>
        </section>
      </Reveal>
    </main>
  );
}
