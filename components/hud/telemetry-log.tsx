import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { TERM } from "@/components/terminal";
import type { IncidentEntry } from "@/lib/telemetry";

/** Color for severity: Normal=green, Low=yellow, Medium=orange, Critical=red. */
function severityColor(sev?: string) {
  switch (sev) {
    case "Critical":
      return "text-red-500";
    case "Medium":
      return "text-orange-500";
    case "Low":
      return "text-yellow-400";
    case "Normal":
      return "text-green-500";
    default:
      return TERM.dimGray;
  }
}

/** Format anomaly type text based on severity level. */
function formatAnomalyType(anomalyType?: string, severity?: string): string {
  if (!anomalyType) return "";
  switch (severity) {
    case "Low":
      return `POSSIBLE ${anomalyType}`;
    case "Medium":
      return `UNCERTAIN ${anomalyType}`;
    case "Critical":
    case "High":
    default:
      return anomalyType;
  }
}

/** Column 3 — Incident Telemetry Log (compact, severity color-coded). */
export function TelemetryLog({
  entries,
  onClear,
}: {
  entries: IncidentEntry[];
  onClear: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const atBottom = useRef(true);

  useEffect(() => {
    if (atBottom.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [entries.length]);

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>// INCIDENT TELEMETRY LOG</Text>
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [{ borderWidth: 1, borderColor: TERM.borderDim, paddingHorizontal: 4, paddingVertical: 2, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.amber }}>[ CLEAR LOGS ]</Text>
        </Pressable>
      </View>

      <View style={{ borderTopWidth: 1, borderColor: TERM.border }}>
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: 160, minHeight: 120 }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
          }}
          scrollEventThrottle={100}
        >
          {entries.map((entry) => (
            <View key={entry.id} className="flex-row px-2 py-[2px]">
              <Text className="font-mono text-[9px]" style={{ color: TERM.dimGray }}>[{entry.ts}]</Text>
              <Text className="ml-1.5 font-mono text-[9px] font-bold" style={{ color: severityColor(entry.severity) }}>
                {entry.severity ? `[${entry.severity}] ` : ""}{entry.message}
                {entry.anomalyType ? ` | ${formatAnomalyType(entry.anomalyType, entry.severity)}` : ""}
              </Text>
            </View>
          ))}
          {entries.length === 0 ? (
            <Text className="px-2 py-1.5 font-mono text-[9px]" style={{ color: TERM.dimGray }}>
              * Log cleared. Awaiting telemetry...
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}