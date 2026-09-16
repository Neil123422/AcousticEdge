import { PctBar, TERM } from "@/components/terminal";
import { Text, View } from "react-native";

/**
 * Column 1 — Acoustic Discriminator.
 * Real-time NORMAL (green) / ANOMALY (amber/red) telemetry bars
 * plus condensed DSP spec inline badges.
 */
export function Discriminator({ 
  normalScore, 
  anomalyScore, 
  anomalyParam,
  anomalySeverity
}: { 
  normalScore: number; 
  anomalyScore: number;
  anomalyParam?: string;
  anomalySeverity?: "Normal" | "Low" | "Medium" | "Critical";
}) {
  const normalPct = Math.min(100, Math.max(0, Math.round(normalScore * 100)));
  const anomalyPct = Math.min(100, Math.max(0, Math.round(anomalyScore * 100)));
  const anomalyTone = anomalyPct >= 70 ? TERM.red : anomalyPct >= 45 ? TERM.amber : TERM.greenMuted;

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>// ACOUSTIC DISCRIMINATOR</Text>
        <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.dimGray }}>I2S_LIVE</Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }} className="gap-y-2 px-2 py-2">
        <View className="gap-y-1.5">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="font-mono text-[9px] tracking-widest" style={{ color: TERM.green }}>NORMAL</Text>
            <Text className="font-mono text-xs font-bold" style={{ color: TERM.green }}>{normalPct}%</Text>
          </View>
          <PctBar pct={normalPct} color={TERM.green} className="bg-green-500" />
        </View>
        <View className="gap-y-1.5">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="font-mono text-[9px] tracking-widest" style={{ color: anomalyTone }}>
              {anomalyParam ? `Anomaly : ${anomalyParam}` : "ANOMALY"}
            </Text>
            <Text className="font-mono text-xs font-bold" style={{ color: anomalyTone }}>{anomalyPct}%</Text>
          </View>
          <PctBar
            pct={anomalyPct}
            color={anomalyTone}
            className={anomalyPct >= 70 ? "bg-red-500" : anomalyPct >= 45 ? "bg-orange-500" : "bg-amber-500"}
          />
        </View>

        {/* Condensed DSP Spec as inline badges */}
        <View className="flex-row flex-wrap gap-x-1 gap-y-1 pt-1" style={{ borderTopWidth: 1, borderColor: TERM.border }}>
          <Text className="font-mono text-[7px] font-bold tracking-widest" style={{ color: TERM.dimGray, borderWidth: 1, borderColor: TERM.dimGray, paddingHorizontal: 3, paddingVertical: 0 }}>
            DSP: Xtensa LX7
          </Text>
          <Text className="font-mono text-[7px] font-bold tracking-widest" style={{ color: TERM.dimGray, borderWidth: 1, borderColor: TERM.dimGray, paddingHorizontal: 3, paddingVertical: 0 }}>
            16 kHz / 16-bit
          </Text>
          <Text className="font-mono text-[7px] font-bold tracking-widest" style={{ color: TERM.dimGray, borderWidth: 1, borderColor: TERM.dimGray, paddingHorizontal: 3, paddingVertical: 0 }}>
            Edge Impulse
          </Text>
        </View>
      </View>
    </View>
  );
}