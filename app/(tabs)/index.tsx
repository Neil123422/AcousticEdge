import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { LiveMonitor } from "@/components/live-monitor";
import { ScreenContainer } from "@/components/screen-container";
import { TermLine, TermPanel, TERM, toneColor } from "@/components/terminal";
import { anomalyPercent } from "@/lib/fault-predictor";
import { buildLogEntry, type AnalysisResult } from "@/lib/poc-analysis";
import { inspectRecording } from "@/lib/inspect-recording";
import { saveInspection } from "@/lib/inspection-store";

const CONVEYORS = ["CV-01 · Primary line", "CV-02 · Transfer line", "CV-03 · Packing line"];

const riskMeta = {
  normal: { tone: "green", label: "NORMAL" },
  review: { tone: "amber", label: "REVIEW" },
  critical: { tone: "red", label: "CRITICAL" },
} as const;

function BootHeader() {
  return (
    <View className="mb-6 pt-3">
      <TermLine prompt tone="text">conveyor-sentinel v1.0.0 — acoustic inspection</TermLine>
      <TermLine tone="dim">boot: mic ready · inference BENCHMARK-CNN-v1 · mode=poc</TermLine>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-mono text-sm font-bold tracking-[2px]" style={{ color: TERM.green }}>CONVEYOR_SENTINEL</Text>
        <Text className="font-mono text-[10px] tracking-[2px]" style={{ color: TERM.greenDim }}>{">> "}POC MODE</Text>
      </View>
    </View>
  );
}

function TargetSelect({ conveyorId, onSelect }: { conveyorId: string; onSelect: (id: string) => void }) {
  return (
    <TermPanel title="INSPECTION TARGET" padding="p-3">
      <View className="gap-y-2">
        {CONVEYORS.map((item) => {
          const active = item === conveyorId;
          return (
            <Pressable
              key={item}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  borderWidth: 1,
                  borderColor: active ? TERM.green : TERM.borderDim,
                  backgroundColor: active ? TERM.panelRaised : "transparent",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                },
              ]}
            >
              <Text className="font-mono text-xs" style={{ color: active ? TERM.green : TERM.textDim }}>
                {active ? "> " : "  "}{item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </TermPanel>
  );
}

function CaptureCard({
  recording,
  busy,
  duration,
  helperText,
  onStart,
  onStop,
}: {
  recording: boolean;
  busy: boolean;
  duration: number;
  helperText: string;
  onStart: () => void;
  onStop: () => void;
}) {
  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");
  const state = busy ? "ANALYZING" : recording ? "REC ●" : "READY";
  const stateTone = busy ? "amber" : recording ? "red" : "green";

  return (
    <TermPanel title="CAPTURE" tone={stateTone}>
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-2xl font-bold" style={{ color: TERM.text }}>00:{mm}:{ss}</Text>
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: toneColor[stateTone] }}>{state}</Text>
      </View>
      <TermLine tone="dim" spacing>sample=10-15s · rate=16khz · mono</TermLine>
      <Pressable
        onPress={recording ? onStop : onStart}
        disabled={busy}
        style={({ pressed }) => [
          {
            marginTop: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: toneColor[stateTone],
            paddingHorizontal: 20,
            paddingVertical: 14,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: busy ? 0.6 : 1,
            backgroundColor: busy ? TERM.panel : recording ? "transparent" : TERM.panelRaised,
          },
        ]}
      >
        <Text className="font-mono text-sm font-bold tracking-[2px]" style={{ color: toneColor[stateTone] }}>
          {busy ? ">> analyzing sample…" : recording ? ">> stop & analyze" : ">> start inspection"}
        </Text>
      </Pressable>
      <Text className="mt-3 font-mono text-xs leading-5" style={{ color: TERM.greenMuted }}>{helperText}</Text>
    </TermPanel>
  );
}

function ResultCard({ result, conveyorId }: { result: AnalysisResult; conveyorId: string }) {
  const meta = riskMeta[result.risk];
  const tone = meta.tone;
  const logEntry = buildLogEntry(result, conveyorId);

  return (
    <TermPanel title="INSPECTION RESULT" tone={tone}>
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: toneColor[tone] }}>{meta.label}</Text>
        <Text className="font-mono text-2xl font-bold" style={{ color: toneColor[tone] }}>{anomalyPercent(result)}%</Text>
      </View>
      <View className="mt-3" style={{ borderTopWidth: 1, borderColor: toneColor[tone] }} />
      <View className="mt-3 gap-y-1.5">
        <TermLine tone="text" spacing>status: {result.summary}</TermLine>
        <TermLine tone="dim" spacing>advice: {result.recommendation}</TermLine>
        <TermLine tone="dim" spacing>model: {result.model}</TermLine>
        <TermLine tone="dim" spacing>signal: {result.signalQuality}</TermLine>
      </View>
      <View className="mt-4" style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.panelRaised, padding: 10 }}>
        <Text className="font-mono text-[10px] tracking-[2px]" style={{ color: TERM.greenDim }}>LOG_REPORT</Text>
        <Text className="mt-1 font-mono text-xs" style={{ color: TERM.textDim }}>{logEntry.code} · parameter: {logEntry.parameter}</Text>
        <Text className="mt-1 font-mono text-xs leading-5" style={{ color: TERM.text }}>{logEntry.message}</Text>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {result.features.map((f) => (
          <Text key={f} className="rounded-none border px-2 py-1 font-mono text-[10px]" style={{ borderColor: TERM.borderDim, color: TERM.textDim }}>
            {f}
          </Text>
        ))}
      </View>
    </TermPanel>
  );
}

export default function HomeScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [conveyorId, setConveyorId] = useState(CONVEYORS[0]);
  const [duration, setDuration] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (recorderState.isRecording) {
      timer = setInterval(() => setDuration((current) => current + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [recorderState.isRecording]);

  useEffect(() => {
    void (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone access needed", "Allow microphone access to record a conveyor inspection sample.");
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })();
  }, []);

  const canStop = recorderState.isRecording;
  const helperText = canStop ? "keep the phone steady at the safe measurement point…" : "record 10–15 seconds of steady conveyor sound.";

  async function startRecording() {
    setResult(null);
    setDuration(0);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("[Inspect] Failed to start recording:", error);
      Alert.alert(
        "Could not start recording",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function stopRecording() {
    setBusy(true);
    try {
      await recorder.stop();
      const measuredDuration = Math.max(duration, 1);
      const analysis = await inspectRecording({
        uri: recorder.uri,
        durationSeconds: measuredDuration,
        conveyorId,
      });
      setResult(analysis);
      await saveInspection({
        ...analysis,
        id: `${Date.now()}`,
        conveyorId,
        recordedAt: new Date().toISOString(),
        durationSeconds: measuredDuration,
      });
      await Haptics.notificationAsync(
        analysis.risk === "critical" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
      );
    } catch (error) {
      console.error("[Inspect] Inspection failed:", error);
      Alert.alert(
        "Inspection failed",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer className="px-4 pb-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <BootHeader />
        <View className="gap-y-4">
          <TargetSelect conveyorId={conveyorId} onSelect={setConveyorId} />
          <CaptureCard
            recording={canStop}
            busy={busy}
            duration={duration}
            helperText={helperText}
            onStart={startRecording}
            onStop={stopRecording}
          />
          <LiveMonitor
            recording={canStop}
            busy={busy}
            result={result}
            durationSeconds={duration}
          />
          {result ? <ResultCard result={result} conveyorId={conveyorId} /> : (
            <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: TERM.borderDim, padding: 16 }}>
              <TermLine tone="dim">awaiting inspection… the pipeline will resample, build log-mel spectrograms, compare with the normal profile, and return a calibrated risk status.</TermLine>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}