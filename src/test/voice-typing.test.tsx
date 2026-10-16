import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVoiceTyping } from "@/hooks/use-voice-typing";

class MockRecognition {
  static current: MockRecognition;
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() { MockRecognition.current = this; }
}

afterEach(() => { Reflect.deleteProperty(window, "SpeechRecognition"); });

describe("voice typing", () => {
  it("inserts final speech once and leaves interim speech out of the input", () => {
    Object.defineProperty(window, "SpeechRecognition", { value: MockRecognition, configurable: true });
    const append = vi.fn();
    const { result, unmount } = renderHook(() => useVoiceTyping(append));
    act(() => result.current.toggle());
    act(() => MockRecognition.current.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "lunch" } }] }));
    expect(append).not.toHaveBeenCalled();
    expect(result.current.interim).toBe("lunch");
    act(() => MockRecognition.current.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "lunch 450" } }] }));
    expect(append).toHaveBeenCalledExactlyOnceWith("lunch 450");
    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
    unmount();
    expect(MockRecognition.current.abort).toHaveBeenCalledOnce();
  });
  it("stops listening when microphone permission is denied", () => {
    Object.defineProperty(window, "SpeechRecognition", { value: MockRecognition, configurable: true });
    const { result } = renderHook(() => useVoiceTyping(vi.fn()));
    act(() => result.current.toggle());
    act(() => MockRecognition.current.onerror?.({ error: "not-allowed" }));
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toContain("Microphone access was denied");
  });
});