import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { TERM } from "@/components/terminal";
import type { IncidentEntry } from "@/lib/telemetry";

function severityColor(sev?: string) {
  switch (sev) {
    case "Critical": return "text-red-500";
    case "Medium": return "text-orange-500";
    case "Low": return "text-yellow-400";
    default: return "text-green-500";
  }
}

function fmt12h(ts: string) {
  // ts is HH:MM:SS; convert to 12-hour with AM/PM
  const [h, m, s] = ts.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;
}

export function TelemetryLog({ entries, onClear }: { entries: IncidentEntry[]; onClear: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const rev = [...entries].reverse();

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [entries.length]);

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>{"// INCIDENT TELEMETRY LOG"}</Text>
        <Pressable onPress={onClear} style={({ pressed }) => [{ borderWidth: 1, borderColor: TERM.borderDim, paddingHorizontal: 4, paddingVertical: 2, opacity: pressed ? 0.6 : 1 }]}>
          <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.green }}>{"[ CLEAR ]"}</Text>
        </Pressable>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }}>
        <ScrollView ref={scrollRef} style={{ maxHeight: 160, minHeight: 120 }}>
          {rev.map((entry) => (
            <View key={entry.id} className="flex-row px-2 py-[2px] items-center justify-between">
              <Text className="font-mono text-[9px] font-bold" style={{ color: severityColor(entry.severity) }}>
                {entry.severity === "Critical" ? "> SPARK [HIGH ALERT]" : entry.severity === "Medium" ? "> SNAP [MEDIUM ALERT]" : entry.severity === "Low" ? "> CRACKING [LOW ALERT]" : "> INFO"}
              </Text>
              <Text className="font-mono text-[9px]" style={{ color: TERM.dimGray }}>{fmt12h(entry.ts)}</Text>
            </View>
          ))}
          {rev.length === 0 && <Text className="px-2 py-1.5 font-mono text-[9px]" style={{ color: TERM.dimGray }}>* Log buffer flushed. Awaiting telemetry...</Text>}
        </ScrollView>
      </View>
    </View>
  );
}
