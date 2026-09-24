import { Pressable, ScrollView, Text, View } from "react-native";

import { TERM } from "@/components/terminal";
import type { IncidentEntry } from "@/lib/telemetry";

interface ParsedAlert {
  label: string;
  color: string;
  isSystem?: boolean;
}

function parseAlert(entry: IncidentEntry): ParsedAlert {
  const raw = `${entry.message} ${entry.anomalyType ?? ""} ${entry.severity ?? ""}`.toUpperCase();

  if (raw.includes("SPARK") || entry.severity === "Critical" || entry.level === "CRIT") {
    return {
      label: "> SPARK [HIGH ALERT]",
      color: TERM.red,
    };
  }

  if (raw.includes("SNAP") || raw.includes("TEAR") || entry.severity === "Medium" || entry.level === "WARN") {
    return {
      label: "> SNAP [MEDIUM ALERT]",
      color: "#f97316",
    };
  }

  if (raw.includes("CRACK") || raw.includes("WHINE") || raw.includes("JAM") || entry.severity === "Low") {
    return {
      label: "> CRACKING [LOW ALERT]",
      color: TERM.amber,
    };
  }

  // System or operator notice
  return {
    label: entry.message.startsWith("*") ? entry.message : `* ${entry.message}`,
    color: TERM.dimGray,
    isSystem: true,
  };
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

  // If timestamp is already in HH:MM:SS 24h format, convert to 12h AM/PM
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
  // Video layout: newest alert appears at the top
  const visibleEntries = [...entries].reverse();

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>
          {"// INCIDENT TELEMETRY LOG"}
        </Text>
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [
            {
              borderWidth: 1,
              borderColor: TERM.amber,
              paddingHorizontal: 6,
              paddingVertical: 1,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.amber }}>
            {"[ CLEAR ]"}
          </Text>
        </Pressable>
      </View>

      {/* Log Feed */}
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }}>
        <ScrollView
          style={{ height: 135 }}
          contentContainerStyle={{ paddingVertical: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {visibleEntries.length === 0 ? (
            <Text className="px-2 py-1.5 font-mono text-[9px]" style={{ color: TERM.dimGray }}>
              * Log buffer flushed. Awaiting telemetry...
            </Text>
          ) : (
            visibleEntries.map((entry) => {
              const alert = parseAlert(entry);
              const timestamp = format12HourTime(entry.ts);

              if (alert.isSystem) {
                return (
                  <View key={entry.id} className="px-2 py-[2px]">
                    <Text className="font-mono text-[9px]" style={{ color: alert.color }}>
                      {alert.label}
                    </Text>
                  </View>
                );
              }

              return (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between px-2 py-[2px]"
                >
                  <Text
                    className="font-mono text-[9px] font-bold tracking-wider"
                    style={{ color: alert.color }}
                  >
                    {alert.label}
                  </Text>
                  <Text
                    className="font-mono text-[8px] tracking-wider"
                    style={{ color: TERM.dimGray }}
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