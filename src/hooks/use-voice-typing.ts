import { useEffect, useRef, useState } from "react";

interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useVoiceTyping(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;

  useEffect(() => {
    const browser = window as SpeechWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    setSupported(Boolean(Constructor));
    if (!Constructor) return;
    const speech = new Constructor();
    speech.continuous = true;
    speech.interimResults = true;
    speech.lang = navigator.language || "en-US";
    speech.onresult = (event) => {
      let draft = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) callback.current(result[0].transcript.trim());
        else draft += result[0].transcript;
      }
      setInterim(draft);
    };
    speech.onerror = ({ error: code }) => {
      if (code === "aborted") return;
      const messages: Record<string, string> = {
        "not-allowed": "Microphone access was denied. Allow microphone access in your browser settings.",
        "service-not-allowed": "Your browser's speech service is unavailable. Please type instead.",
        "audio-capture": "No microphone was found. Connect a microphone and try again.",
        "no-speech": "No speech was detected. Try again when you’re ready.",
        network: "Voice typing could not connect. Check your connection and try again.",
      };
      setError(messages[code] ?? "Voice typing stopped. Please try again or type instead.");
      setListening(false);
      setInterim("");
    };
    speech.onend = () => { setListening(false); setInterim(""); };
    recognition.current = speech;
    return () => {
      speech.onresult = null;
      speech.onerror = null;
      speech.onend = null;
      speech.abort();
      recognition.current = null;
    };
  }, []);

  const stop = () => recognition.current?.stop();
  const toggle = () => {
    if (listening) { stop(); return; }
    setError("");
    try {
      recognition.current?.start();
      setListening(Boolean(recognition.current));
    } catch {
      setError("Voice typing could not start. Please try again.");
      setListening(false);
    }
  };
  return { supported, listening, interim, error, toggle, stop };
}