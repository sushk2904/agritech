"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

const PROCESS_STAGE_INDEX = {
  FETCHING_KEY: 1,
  HASHING: 2,
  GENERATING_PROOF: 3,
  ENCRYPTING: 4,
  SUBMITTING: 5,
  SUCCESS: 5
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
    heroTitleAuthenticated: "Claim card",
    heroLeadAuthenticated: "Choose Flood, Drought, or Pest, then upload one image to start the claim.",
    heroTitleGuest: "Sign in to open the secure claim workspace.",
    heroLeadGuest: "Email OTP unlocks the profile, plot lookup, and encrypted claim flow.",
    signedInAs: "Signed in as",
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
    claimLead: "Only the main claim flow is shown here.",
    selectedEvidence: "Selected evidence",
    noEvidence: "No file selected",
    latestStatus: "Latest status",
    uploadAction: "Upload image",
    loginAction: "Open login",
    processTitle: "Claim process",
    processWaiting: "The claim process will appear after you upload an image.",
    processSteps: [
      "Image added",
      "Secure key",
      "Image hash",
      "Proof bundle",
      "Encryption",
      "Submission"
    ],
    plotUnavailable: "Live plot coordinates are not loaded yet.",
    vertexLabel: "vertices",
    polygonFallback: "Polygon"
  },
  hi: {
    eyebrow: "Secure workspace",
    heroTitleAuthenticated: "Claim card",
    heroLeadAuthenticated: "Flood, Drought ya Pest चुनें, फिर claim शुरू करने के लिए एक image upload करें।",
    heroTitleGuest: "Secure claim workspace खोलने के लिए sign in करें।",
    heroLeadGuest: "Email OTP से profile, plot lookup और encrypted claim flow खुलेगा।",
    signedInAs: "Signed in as",
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
    claimLead: "यहां सिर्फ मुख्य claim flow दिखाया गया है।",
    selectedEvidence: "Selected evidence",
    noEvidence: "कोई file selected नहीं है",
    latestStatus: "Latest status",
    uploadAction: "Image upload करें",
    loginAction: "Login खोलें",
    processTitle: "Claim process",
    processWaiting: "Image upload करने के बाद claim process यहां दिखेगा।",
    processSteps: [
      "Image added",
      "Secure key",
      "Image hash",
      "Proof bundle",
      "Encryption",
      "Submission"
    ],
    plotUnavailable: "Live plot coordinates अभी load नहीं हुई हैं।",
    vertexLabel: "vertices",
    polygonFallback: "Polygon"
  }
};

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
  const [processStageIndex, setProcessStageIndex] = useState(-1);

  const hashedFarmerId = session?.hashedFarmerId || DEMO_HASHED_FARMER_ID;
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
    claimResponse ||
    workspaceError ||
    (processStageIndex >= 0
      ? pipelineLabels[pipelineStatus] || pipelineLabels.IDLE
      : text.processWaiting || workspaceStatus || pipelineLabels.IDLE);

  const latestStatusClassName = claimResponse
    ? "form-result"
    : workspaceError
      ? "form-status form-status-error"
      : "form-status form-status-neutral";

  const processSteps = text.processSteps || [];
  const showProcess = processStageIndex >= 0;

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
    setProcessStageIndex(0);

    try {
      let activePublicKey = publicKeyBase64;

      if (!activePublicKey) {
        setPipelineStatus("FETCHING_KEY");
        setProcessStageIndex(PROCESS_STAGE_INDEX.FETCHING_KEY);
        activePublicKey = await fetchPublicKey();
        setPublicKeyBase64(activePublicKey);
      }

      const bundle = await prepareSecureClaimBundle({
        file,
        damageType: selectedDamageType,
        hashedFarmerId,
        publicKeyBase64: activePublicKey,
        onStageChange: (stage) => {
          setPipelineStatus(stage);
          setProcessStageIndex(PROCESS_STAGE_INDEX[stage] ?? 0);
        }
      });

      setPipelineStatus("SUBMITTING");
      setProcessStageIndex(PROCESS_STAGE_INDEX.SUBMITTING);
      const responseText = await submitClaimBundle(bundle, session?.token);
      setClaimResponse(responseText);
      setPipelineStatus("SUCCESS");
      setProcessStageIndex(PROCESS_STAGE_INDEX.SUCCESS);
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
      <section className="project-minimal-shell">
        <section className="minimal-single-column">
          <article className="workspace-card minimal-primary-card">
            <div className="minimal-topline">
              <div className="minimal-copy">
                <p className="eyebrow">{text.eyebrow}</p>
                <h1>{isAuthenticated ? text.heroTitleAuthenticated : text.heroTitleGuest}</h1>
                <p className="page-lead minimal-lead">
                  {isAuthenticated ? text.heroLeadAuthenticated : text.heroLeadGuest}
                </p>
              </div>

              <span className="status-chip">
                {isAuthenticated ? text.states.sessionReady : text.states.signInRequired}
              </span>
            </div>

            {isAuthenticated ? <p className="minimal-signed-in">{`${text.signedInAs} ${displayEmail}`}</p> : null}

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

            {selectedFileName ? (
              <div className="minimal-evidence-grid">
                <div className="minimal-evidence-card">
                  <span>{text.selectedEvidence}</span>
                  <strong>{selectedFileName}</strong>
                </div>
              </div>
            ) : null}

            <div className="hero-actions minimal-actions">
              <button type="button" className="button button-primary" onClick={handleClaimButtonClick}>
                {isAuthenticated ? text.uploadAction : text.loginAction}
              </button>
            </div>

            {showProcess ? (
              <div className="minimal-process-panel">
                <span className="minimal-status-label">{text.processTitle}</span>
                <div className="minimal-process-list">
                  {processSteps.map((step, index) => {
                    const isDone = pipelineStatus === "SUCCESS" ? true : index < processStageIndex;
                    const isActive = pipelineStatus === "ERROR" ? index === processStageIndex : index === processStageIndex;

                    return (
                      <div
                        key={step}
                        className={`minimal-process-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""} ${pipelineStatus === "ERROR" && isActive ? "is-error" : ""}`}
                      >
                        <span className="minimal-process-badge">{String(index + 1).padStart(2, "0")}</span>
                        <p>{step}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="field-note minimal-process-empty">{text.processWaiting}</p>
            )}

            <div className="minimal-status-panel">
              <span className="minimal-status-label">{text.latestStatus}</span>
              <p className={latestStatusClassName}>{latestStatus}</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
