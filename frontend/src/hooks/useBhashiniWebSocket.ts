import { useState, useCallback, useRef } from "react";

export type BhashiniState = "IDLE" | "LISTENING" | "PROCESSING";

export interface BhashiniIntent {
  intent: string;
  text: string;
  language: string;
}

/**
 * Core Hook to manage Bhashini Streaming Protocol States
 * Integrates directly with the native browser MediaRecorder API
 */
export function useBhashiniWebSocket() {
  const [voiceState, setVoiceState] = useState<BhashiniState>("IDLE");
  const [transcription, setTranscription] = useState<string>("");
  const [intentResult, setIntentResult] = useState<BhashiniIntent | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Simulating the Network Latency of translating Hindi to English intents via WebSocket APIs
  const mockWebSocketSimulate = useCallback(async () => {
    setVoiceState("PROCESSING");
    
    // Simulate precisely 1.5 seconds delay to mimic real Bhashini models evaluating
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResponse: BhashiniIntent = {
      intent: "SUBMIT_CLAIM",
      text: "Mere khet mein baad aagayi hai",
      language: "hi"
    };

    setTranscription(mockResponse.text);
    setIntentResult(mockResponse);
    setVoiceState("IDLE");
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          // PRODUCTION NOTE: This is where we stream live blobs over strict wss:// bindings
        }
      };

      recorder.onstop = () => {
        // Stop native streams instantly once recording resolves implicitly to free device handles
        stream.getTracks().forEach(track => track.stop());
        mockWebSocketSimulate(); // Trigger strictly mapped intent evaluation
      };

      // Native chunking interval mapping to typical Whisper/VAD block logic
      recorder.start(250); 
      setVoiceState("LISTENING");
      setTranscription("");
      setIntentResult(null);
    } catch (err) {
      console.error("[Microphone Access Violation] Native browser handles failed:", err);
      setVoiceState("IDLE"); // Hygienic UI fallback
    }
  }, [mockWebSocketSimulate]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    voiceState,
    transcription,
    intentResult,
    startListening,
    stopListening
  };
}
