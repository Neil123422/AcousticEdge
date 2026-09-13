import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { TermLine, TermPanel, TERM, toneColor, type TermTone } from "@/components/terminal";
import { anomalyPercent } from "@/lib/fault-predictor";
import { clearInspections, getInspections, type Inspection } from "@/lib/inspection-store";
import { buildLogEntry, formatRisk, type RiskLevel } from "@/lib/poc-analysis";

const toneForRisk: Record<RiskLevel, TermTone> = {
  normal: "green",
  review: "amber",
  critical: "red",
};

function LogRow({ inspection }: { inspection: Inspection }) {
  const tone = toneForRisk[inspection.risk];
  const logEntry = buildLogEntry(inspection, inspection.conveyorId);
  const ts = new Date(inspection.recordedAt).toLocaleString();

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.panelRaised, padding: 10 }}>
      <View className="flex-row items-start justify-between gap-x-2">
        <Text className="flex-1 font-mono text-xs font-bold" style={{ color: TERM.text }}>{inspection.conveyorId}</Text>
        <Text className="font-mono text-[10px] font-bold tracking-wider" style={{ color: toneColor[tone] }}>{formatRisk(inspection.risk)}</Text>
      </View>
      <Text className="mt-1 font-mono text-[10px]" style={{ color: TERM.greenMuted }}>{ts} · {inspection.durationSeconds}s · {inspection.model}</Text>
      <Text className="mt-2 font-mono text-xs leading-5" style={{ color: TERM.textDim }}>{inspection.summary}</Text>
      <View className="mt-3" style={{ borderTopWidth: 1, borderColor: TERM.borderDim, paddingTop: 8 }}>
        <Text className="font-mono text-[10px] tracking-[2px]" style={{ color: TERM.greenDim }}>LOG_REPORT</Text>
        <Text className="mt-1 font-mono text-[11px]" style={{ color: TERM.textDim }}>
          {logEntry.code} · parameter: {logEntry.parameter} · score {anomalyPercent(inspection)}%
        </Text>
        <Text className="mt-1 font-mono text-[11px] leading-4" style={{ color: TERM.text }}>{logEntry.message}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const load = useCallback(async () => setInspections(await getInspections()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function clearHistory() {
    Alert.alert("Clear logs", `Purge ${inspections.length} stored acoustic event(s)?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "rm -f log",
        style: "destructive",
        onPress: async () => {
          await clearInspections();
          setInspections([]);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  return (
    <ScreenContainer className="px-4 pb-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="mb-4 pt-3">
          <TermLine prompt tone="text">history --log conveyor-acoustic</TermLine>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="font-mono text-sm font-bold tracking-[2px]" style={{ color: TERM.green }}>LOCAL_LOG</Text>
            <Text className="font-mono text-[10px] tracking-[2px]" style={{ color: TERM.greenDim }}>{inspections.length} entries</Text>
          </View>
        </View>

        <TermLine tone="dim" spacing># results stay on-device for the POC; cloud sync is the next backend step.</TermLine>

        <View className="mt-5 mb-4">
          <Pressable
            onPress={clearHistory}
            disabled={inspections.length === 0}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: inspections.length === 0 ? TERM.borderDim : TERM.red,
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: pressed ? 0.7 : inspections.length === 0 ? 0.35 : 1,
                backgroundColor: inspections.length === 0 ? "transparent" : TERM.panelRaised,
              },
            ]}
          >
            <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: inspections.length === 0 ? TERM.greenMuted : TERM.red }}>
              {inspections.length === 0 ? "[ CLEAR LOGS — EMPTY ]" : "[ CLEAR LOGS ]"}
            </Text>
            {inspections.length > 0 ? <Text className="font-mono text-[10px]" style={{ color: TERM.red }}>rm -f</Text> : null}
          </Pressable>
        </View>

        {inspections.length === 0 ? (
          <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: TERM.borderDim, padding: 16 }}>
            <TermLine prompt tone="text">no inspections yet — run a sample from Home.</TermLine>
            <Text className="mt-2 font-mono text-xs leading-5" style={{ color: TERM.greenMuted }}>
              results will appear here with model status and duration.
            </Text>
          </View>
        ) : (
          <View className="gap-y-3">
            {inspections.map((inspection) => <LogRow key={inspection.id} inspection={inspection} />)}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}