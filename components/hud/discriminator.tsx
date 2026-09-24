import { PctBar, TERM } from "@/components/terminal";
import { Text, View } from "react-native";

export interface DiscriminatorProps {
  normalScore: number;
  anomalyScore: number;
  anomalyParam?: string;
  anomalySeverity?: "Normal" | "Low" | "Medium" | "Critical";
}

/**
 * Column 1 — Acoustic Discriminator.
 * Real-time NORMAL (green) / ANOMALY (reactive yellow/orange/red) telemetry bars
 * plus condensed single-line DSP spec badge.
 */
export function Discriminator({
  normalScore,
  anomalyScore,
  anomalyParam,
  anomalySeverity,
}: DiscriminatorProps) {
  const normalPct = Math.min(100, Math.max(0, Math.round(normalScore * 100)));
  const anomalyPct = Math.min(100, Math.max(0, Math.round(anomalyScore * 100)));

  // Reactive tone and NativeWind fill class based on severity
  let anomalyTone: string = TERM.greenMuted;
  let anomalyBarClass = "bg-green-500";

  if (anomalySeverity === "Critical" || anomalyPct >= 70) {
    anomalyTone = TERM.red;
    anomalyBarClass = "bg-red-500";
  } else if (anomalySeverity === "Medium" || anomalyPct >= 45) {
    anomalyTone = "#f97316";
    anomalyBarClass = "bg-orange-500";
  } else if (anomalySeverity === "Low" || anomalyPct >= 20) {
    anomalyTone = TERM.amber;
    anomalyBarClass = "bg-yellow-400";
  }

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>
          {"// ACOUSTIC DISCRIMINATOR"}
        </Text>
        <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.dimGray }}>
          I2S_LIVE
        </Text>
      </View>

      {/* Telemetry meters */}
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }} className="gap-y-2 px-2 py-2">
        {/* Normal Meter */}
        <View className="gap-y-1.5">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="font-mono text-[9px] tracking-widest" style={{ color: TERM.green }}>
              NORMAL
            </Text>
            <Text className="font-mono text-xs font-bold" style={{ color: TERM.green }}>
              {normalPct}%
            </Text>
          </View>
          <PctBar pct={normalPct} color={TERM.green} className="bg-green-500" />
        </View>

        {/* Anomaly Meter */}
        <View className="gap-y-1.5">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="font-mono text-[9px] tracking-widest" style={{ color: anomalyTone }}>
              {anomalyParam ? `ANOMALY: ${anomalyParam.toUpperCase()}` : "ANOMALY"}
            </Text>
            <Text className="font-mono text-xs font-bold" style={{ color: anomalyTone }}>
              {anomalyPct}%
            </Text>
          </View>
          <PctBar
            pct={anomalyPct}
            color={anomalyTone}
            className={anomalyBarClass}
          />
        </View>

        {/* Compact bottom DSP spec badge */}
        <View className="pt-1" style={{ borderTopWidth: 1, borderColor: TERM.border }}>
          <Text
            className="font-mono text-[7px] font-bold tracking-wider"
            style={{
              color: TERM.dimGray,
              borderWidth: 1,
              borderColor: TERM.dimGray,
              paddingHorizontal: 4,
              paddingVertical: 1,
            }}
            numberOfLines={1}
          >
            {"DSP CORE: Xtensa LX7 Dual-Core | SAMPLE RATE: 16.0 kHz / 16-bit | INFERENCE: Edge Impulse TinyML"}
          </Text>
        </View>
      </View>
    </View>
  );
}