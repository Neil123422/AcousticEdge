import { ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TermLine, TermPanel, TERM, toneColor, type TermTone } from "@/components/terminal";

const layers = [
  { label: "CAPTURE", title: "Phone microphone", detail: "Expo Audio recorder · 10–15 second inspection sample", tone: "green" as TermTone },
  { label: "VALIDATE", title: "Signal quality gate", detail: "Duration, microphone permission, and recording URI checks", tone: "green" as TermTone },
  { label: "FEATURES", title: "Log-mel spectrogram", detail: "16kHz mono · 64 mels · 4s windows · 0.5 overlap", tone: "amber" as TermTone },
  { label: "MODELS", title: "CNN classifier", detail: "BENCHMARK-CNN-v1 · window-acc 0.876 · clip-acc 0.833", tone: "amber" as TermTone },
  { label: "ACTION", title: "Normal · Review · Critical", detail: "Risk output with a safe inspection recommendation", tone: "red" as TermTone },
];

export default function ArchitectureScreen() {
  return (
    <ScreenContainer className="px-4 pb-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="mb-5 pt-3">
          <TermLine prompt tone="text">cat architecture.txt</TermLine>
          <Text className="mt-1 font-mono text-xs" style={{ color: TERM.greenMuted }}># how the poc is built</Text>
        </View>

        <TermPanel title="SYSTEM MAP">
          <View className="gap-y-3">
            {layers.map((layer, index) => (
              <View key={layer.label} className="flex-row">
                <View className="mr-3 items-center">
                  <Text className="font-mono text-xs font-bold" style={{ color: toneColor[layer.tone] }}>{String(index + 1).padStart(2, "0")}</Text>
                  {index < layers.length - 1 ? <View className="my-1 w-px flex-1" style={{ backgroundColor: TERM.greenDim }} /> : null}
                </View>
                <View className="flex-1" style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.panelRaised, padding: 10 }}>
                  <Text className="font-mono text-[10px] font-bold tracking-[2px]" style={{ color: toneColor[layer.tone] }}>{layer.label}</Text>
                  <Text className="mt-1 font-mono text-sm font-bold" style={{ color: TERM.text }}>{layer.title}</Text>
                  <Text className="mt-1 font-mono text-[11px] leading-4" style={{ color: TERM.greenMuted }}>{layer.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </TermPanel>

        <View className="mt-5">
          <TermPanel title="MODEL BOUNDARY" tone="amber">
            <TermLine tone="text">what is real today?</TermLine>
            <Text className="mt-2 font-mono text-xs leading-5" style={{ color: TERM.greenMuted }}>
              Microphone capture, live tracking, local history, and the transparent demo scoring layer are implemented. The production anomaly model must be trained and validated on conveyor-specific recordings before it is used for safety decisions.
            </Text>
          </TermPanel>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}