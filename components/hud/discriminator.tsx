import { PctBar, TERM } from "@/components/terminal";
import { Text, View } from "react-native";

export interface DiscriminatorProps {
  normalScore: number;
  anomalyScore: number;
  anomalyParam?: string;
  anomalySeverity?: "Normal" | "Low" | "Medium" | "Critical";
}

export function Discriminator({
  normalScore, anomalyScore, anomalyParam, anomalySeverity
}: DiscriminatorProps) {
  const normalPct = Math.min(100, Math.max(0, Math.round(normalScore * 100)));
  const anomalyPct = Math.min(100, Math.max(0, Math.round(anomalyScore * 100)));
  const tone = anomalyPct >= 70 ? TERM.red : anomalyPct >= 45 ? TERM.amber : TERM.greenMuted;

  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>{"// ACOUSTIC DISCRIMINATOR"}</Text>
        <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.dimGray }}>I2S_LIVE</Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }} className="gap-y-2 px-2 py-2">
        <View className="gap-y-1.5">
          <View className="flex-row justify-between"><Text className="font-mono text-[9px]" style={{ color: TERM.green }}>NORMAL</Text><Text className="font-mono text-xs font-bold" style={{ color: TERM.green }}>{normalPct}%</Text></View>
          <PctBar pct={normalPct} color={TERM.green} className="bg-green-500" />
        </View>
        <View className="gap-y-1.5">
          <View className="flex-row justify-between"><Text className="font-mono text-[9px]" style={{ color: tone }}>{anomalyParam ? `ANOMALY: ${anomalyParam}` : "ANOMALY"}</Text><Text className="font-mono text-xs font-bold" style={{ color: tone }}>{anomalyPct}%</Text></View>
          <PctBar pct={anomalyPct} color={tone} className={anomalyPct >= 70 ? "bg-red-500" : anomalyPct >= 45 ? "bg-orange-500" : "bg-amber-500"} />
        </View>
        <View style={{ borderTopWidth: 1, borderColor: TERM.border, paddingTop: 4 }}>
          <Text className="font-mono text-[7px] font-bold tracking-widest" style={{ color: TERM.dimGray }}>
            DSP CORE: Xtensa LX7 Dual-Core{"  |  "}SAMPLE RATE: 16.0 kHz / 16-bit{"  |  "}INFERENCE: Edge Impulse TinyML
          </Text>
        </View>
      </View>
    </View>
  );
}
