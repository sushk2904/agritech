"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSiteState } from "../../components/site-state";
import {
  DEMO_HASHED_FARMER_ID,
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
    IDLE: "Upload an image to start the claim.",
    FETCHING_KEY: "Preparing secure key.",
    HASHING: "Hashing image.",
    GENERATING_PROOF: "Preparing proof bundle.",
    ENCRYPTING: "Encrypting payload.",
    SUBMITTING: "Submitting claim.",
    SUCCESS: "Claim submitted successfully.",
    ERROR: "Claim submission failed."
  },
  hi: {
    IDLE: "क्लेम शुरू करने के लिए image upload करें।",
    FETCHING_KEY: "Secure key तैयार हो रही है।",
    HASHING: "Image hash हो रही है।",
    GENERATING_PROOF: "Proof bundle तैयार हो रहा है।",
    ENCRYPTING: "Payload encrypt हो रहा है।",
    SUBMITTING: "Claim submit हो रही है।",
    SUCCESS: "Claim सफलतापूर्वक submit हो गई।",
    ERROR: "Claim submission पूरा नहीं हुआ।"
  }
};

const PROJECT_UI_COPY = {
  en: {
    eyebrow: "Claim",
    title: "File a crop claim.",
    leadSignedIn: "Everything important stays in one card: choose type, upload one image, then track the process.",
    leadGuest: "Sign in first to open the claim card.",
    signedInAs: "Signed in as",
    sessionReady: "Session ready",
    signInRequired: "Sign in required",
    damageTypeLabel: "Select damage type",
    uploadAction: "Upload image",
    loginAction: "Open login",
    selectedEvidence: "Selected image",
    latestStatus: "Status",
    processTitle: "Claim process",
    processWaiting: "The process appears after you upload an image.",
    helperGuest: "OTP login unlocks secure upload and submission.",
    helperSignedIn: "Only the core claim steps are shown here so the page stays focused.",
    emailFallback: "Not available",
    guideCards: [
      {
        title: "Choose damage",
        text: "Keep the claim type limited to Flood, Drought, or Pest."
      },
      {
        title: "Upload one image",
        text: "One clear field image is enough to start the workflow."
      },
      {
        title: "Track the flow",
        text: "After upload, the full secure claim process appears below."
      }
    ],
    processSteps: [
      "Image added",
      "Secure key",
      "Image hash",
      "Proof bundle",
      "Encryption",
      "Submission"
    ]
  },
  hi: {
    eyebrow: "क्लेम",
    title: "फसल क्लेम दर्ज करें।",
    leadSignedIn: "सारी जरूरी चीजें एक card में हैं: type चुनें, एक image upload करें, फिर process track करें।",
    leadGuest: "Claim card खोलने के लिए पहले sign in करें।",
    signedInAs: "लॉगिन किया गया",
    sessionReady: "सत्र तैयार",
    signInRequired: "लॉगिन ज़रूरी",
    damageTypeLabel: "Damage type चुनें",
    uploadAction: "Image upload करें",
    loginAction: "लॉगिन खोलें",
    selectedEvidence: "चुनी गई image",
    latestStatus: "स्थिति",
    processTitle: "Claim process",
    processWaiting: "Image upload करने के बाद process यहां दिखेगा।",
    helperGuest: "OTP login secure upload और submission खोलता है।",
    helperSignedIn: "यहां सिर्फ core claim steps दिखते हैं ताकि page focused रहे।",
    emailFallback: "उपलब्ध नहीं",
    guideCards: [
      {
        title: "Damage चुनें",
        text: "Claim type को Flood, Drought, या Pest तक ही रखें।"
      },
      {
        title: "एक image upload करें",
        text: "Workflow शुरू करने के लिए एक साफ field image काफी है।"
      },
      {
        title: "Flow track करें",
        text: "Upload के बाद पूरा secure claim process नीचे दिखता है।"
      }
    ],
    processSteps: [
      "Image जोड़ी गई",
      "Secure key",
      "Image hash",
      "Proof bundle",
      "Encryption",
      "Submission"
    ]
  }
};

export default function ProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const { language, isAuthenticated, session } = useSiteState();
  const text = PROJECT_UI_COPY[language] || PROJECT_UI_COPY.en;
  const pipelineLabels = PIPELINE_STATUS_LABELS[language] || PIPELINE_STATUS_LABELS.en;
  const damageTypes = DAMAGE_TYPES[language] || DAMAGE_TYPES.en;

  const [selectedDamageType, setSelectedDamageType] = useState("FLOOD");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState("IDLE");
  const [workspaceError, setWorkspaceError] = useState("");
  const [claimResponse, setClaimResponse] = useState("");
  const [publicKeyBase64, setPublicKeyBase64] = useState("");
  const [processStageIndex, setProcessStageIndex] = useState(-1);

  const latestStatus =
    claimResponse ||
    workspaceError ||
    (processStageIndex >= 0 ? pipelineLabels[pipelineStatus] || pipelineLabels.IDLE : text.processWaiting);

  const latestStatusClassName = claimResponse
    ? "form-result"
    : workspaceError
      ? "form-status form-status-error"
      : "form-status form-status-neutral";

  const showProcess = processStageIndex >= 0;
  const hashedFarmerId = session?.hashedFarmerId || DEMO_HASHED_FARMER_ID;
  const displayEmail = session?.email || text.emailFallback;

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
    setWorkspaceError("");
    setClaimResponse("");
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
      <section className="project-shell">
        <article className="project-card project-card-modern">
          <div className="project-head">
            <div>
              <p className="eyebrow">{text.eyebrow}</p>
              <h1>{text.title}</h1>
              <p className="page-lead">{isAuthenticated ? text.leadSignedIn : text.leadGuest}</p>
              {isAuthenticated ? <p className="signed-in-text">{`${text.signedInAs} ${displayEmail}`}</p> : null}
            </div>
            <span className="status-chip">{isAuthenticated ? text.sessionReady : text.signInRequired}</span>
          </div>

          <div className="project-guide-grid">
            {text.guideCards.map((card) => (
              <article key={card.title} className="project-guide-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          <p className="project-helper-copy">{isAuthenticated ? text.helperSignedIn : text.helperGuest}</p>

          <div className="damage-selector" role="group" aria-label={text.damageTypeLabel}>
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

          <div className="project-action-row">
            <button
              type="button"
              className="button button-primary project-action-button"
              onClick={handleClaimButtonClick}
            >
              {isAuthenticated ? text.uploadAction : text.loginAction}
            </button>
          </div>

          {selectedFileName ? (
            <div className="minimal-evidence-card">
              <span>{text.selectedEvidence}</span>
              <strong>{selectedFileName}</strong>
            </div>
          ) : null}

          {showProcess ? (
            <div className="minimal-process-panel">
              <span className="minimal-status-label">{text.processTitle}</span>
              <div className="minimal-process-list">
                {text.processSteps.map((step, index) => {
                  const isDone = pipelineStatus === "SUCCESS" ? true : index < processStageIndex;
                  const isActive = index === processStageIndex;

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
    </main>
  );
}
