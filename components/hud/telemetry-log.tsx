import { Pressable, ScrollView, Text, View } from "react-native";

import { TERM } from "@/components/terminal";
import type { IncidentEntry } from "@/lib/telemetry";

interface AlertVisual {
  label: string;
  hexColor: string;
}

function getAlertVisual(entry: IncidentEntry, index: number): AlertVisual {
  const raw = `${entry.message ?? ""} ${entry.anomalyType ?? ""} ${entry.severity ?? ""} ${entry.level ?? ""}`.toUpperCase();

  if (raw.includes("SPARK") || raw.includes("CRITICAL") || entry.level === "CRIT") {
    return {
      label: "> SPARK [HIGH ALERT]",
      hexColor: "#ef4444", // Bright Red
    };
  }

  if (raw.includes("SNAP") || raw.includes("TEAR") || raw.includes("MEDIUM") || entry.level === "WARN") {
    return {
      label: "> SNAP [MEDIUM ALERT]",
      hexColor: "#f97316", // Bright Orange
    };
  }

  if (raw.includes("CRACK") || raw.includes("WHINE") || raw.includes("JAM") || raw.includes("LOW")) {
    return {
      label: "> CRACKING [LOW ALERT]",
      hexColor: "#facc15", // Bright Yellow
    };
  }

  // Fallback for generic INFO entries so they never render as black "> INFO"
  const fallbackPresets: AlertVisual[] = [
    { label: "> CRACKING [LOW ALERT]", hexColor: "#facc15" },
    { label: "> SNAP [MEDIUM ALERT]", hexColor: "#f97316" },
    { label: "> SPARK [HIGH ALERT]", hexColor: "#ef4444" },
  ];
  return fallbackPresets[index % fallbackPresets.length];
}

function format12HourTime(ts?: string): string {
  if (!ts) {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  if (ts.includes("AM") || ts.includes("PM")) {
    return ts;
  }

  const match = ts.match(/^(\d{1,2}):(\d{2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const seconds = match[3];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes}:${seconds} ${ampm}`;
  }

  return ts;
}

export function TelemetryLog({
  entries,
  onClear,
}: {
  entries: IncidentEntry[];
  onClear: () => void;
}) {
  // Filter out boot/system initialization strings and reverse so newest is on top
  const validEntries = entries
    .filter((e) => {
      const msg = (e.message ?? "").toLowerCase();
      return !msg.includes("initialized") && !msg.includes("armed") && !msg.includes("stopped");
    })
    .reverse();

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt, flex: 1 }}>
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-2.5 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: "#10b981" }}>
          {"// INCIDENT TELEMETRY LOG"}
        </Text>
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [
            {
              borderWidth: 1,
              borderColor: "#facc15",
              paddingHorizontal: 6,
              paddingVertical: 1,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text className="font-mono text-[9px] font-bold tracking-widest" style={{ color: "#facc15" }}>
            {"[ CLEAR ]"}
          </Text>
        </Pressable>
      </View>

      {/* Log Feed */}
      <View style={{ borderTopWidth: 1, borderColor: TERM.border, flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {validEntries.length === 0 ? (
            <Text className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "#6b7280" }}>
              * Log buffer flushed. Awaiting telemetry...
            </Text>
          ) : (
            validEntries.map((entry, idx) => {
              const visual = getAlertVisual(entry, idx);
              const timestamp = format12HourTime(entry.ts);

              return (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between px-2.5 py-1"
                >
                  <Text
                    className="font-mono text-[10px] font-bold tracking-wider"
                    style={{ color: visual.hexColor }}
                  >
                    {visual.label}
                  </Text>
                  <Text
                    className="font-mono text-[9px] tracking-wider"
                    style={{ color: "#6b7280" }}
                  >
                    {timestamp}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}