import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { useVoiceTyping } from "@/hooks/use-voice-typing";

export function VoiceTypingButton({ voice, disabled = false }: {
  voice: ReturnType<typeof useVoiceTyping>;
  disabled?: boolean;
}) {
  const label = voice.listening ? "Stop voice typing" : "Start voice typing";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant={voice.listening ? "destructive" : "outline"} size="icon"
            className="shrink-0" aria-label={label} aria-pressed={voice.listening}
            disabled={disabled || !voice.supported} onClick={voice.toggle}
            title={voice.supported ? label : "Voice typing requires a supported browser such as Chrome or Edge"}>
            {voice.listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function VoiceTypingStatus({ voice }: { voice: ReturnType<typeof useVoiceTyping> }) {
  return <>
    {voice.listening && <p role="status" className="mt-2 text-xs text-muted-foreground">{voice.interim || "Listening…"}</p>}
    {voice.error && <p role="alert" className="mt-2 text-xs text-destructive">{voice.error}</p>}
    {!voice.supported && <p className="mt-2 text-xs text-muted-foreground">Voice typing is unavailable in this browser. Try Chrome or Edge.</p>}
  </>;
}