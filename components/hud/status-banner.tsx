import { Text, View } from "react-native";
import { TERM } from "@/components/terminal";

export type BannerState = "OK" | "ADVISORY" | "WARNING" | "CRITICAL";

export interface StatusBannerProps {
  live: boolean;
  anomalyType?: string;
  anomalySeverity?: "Low" | "Medium" | "Critical" | "Normal";
  bufferPercent?: number;
}

function getState(sev?: string): BannerState {
  if (!sev || sev === "Normal") return "OK";
  if (sev === "Low") return "ADVISORY";
  if (sev === "Medium") return "WARNING";
  return "CRITICAL";
}

function getColors(s: BannerState) {
  switch (s) {
    case "OK": return { border: "border-emerald-500", hex: "#34d399", bar: TERM.green, msgColor: TERM.greenMuted };
    case "ADVISORY": return { border: "border-yellow-500", hex: "#facc15", bar: TERM.amber, msgColor: "#facc15" };
    case "WARNING": return { border: "border-orange-500", hex: "#fb923c", bar: "#f97316", msgColor: "#fb923c" };
    case "CRITICAL": return { border: "border-red-500", hex: "#f87171", bar: TERM.red, msgColor: TERM.red };
  }
}

export function StatusBanner({ live, anomalyType, anomalySeverity, bufferPercent = 0 }: StatusBannerProps) {
  const s = getState(anomalySeverity);
  const c = getColors(s);
  const label = live ? (s === "OK" ? "[ OK ] NORMAL OPERATION // NOMINAL" : s === "ADVISORY" ? "[ ADVISORY ] ANOMALY DETECTED // CRACKING [LOW ALERT]" : s === "WARNING" ? "[ WARNING ] ANOMALY DETECTED // SNAP [MEDIUM ALERT]" : "[ CRITICAL ] ANOMALY DETECTED // SPARK [HIGH ALERT]") : "[ -- ] MONITORING PAUSED // STANDBY";
  const msg = live ? (s === "OK" ? "Continuous baseline acoustic profile nominal. No structural faults detected." : s === "ADVISORY" ? "> ADVISORY: Longitudinal carcass micro-fissure or surface fatigue noise identified." : s === "WARNING" ? "WARNING: Belt tensile snap or splice rupture transient waveform recorded." : "> DANGER: Spark acoustic or roller seizure friction signature identified. Auto E-Stop armed.") : "Acoustic telemetry paused. Click [ START MONITORING ] to resume.";

  return (
    <View className={`border-2 ${c.border} rounded-none`} style={{ borderColor: c.hex, backgroundColor: live ? TERM.panelRaised : TERM.bgAlt }}>
      <View className="flex-row items-center gap-4 px-3 py-2">
        {/* Left: headline + message */}
        <View className="flex-1">
          <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: live ? c.hex : TERM.dimGray }} numberOfLines={1}>{label}</Text>
          <Text className="mt-1 font-mono text-[10px]" style={{ color: live ? (s === "OK" ? TERM.greenMuted : c.hex) : TERM.dimGray }} numberOfLines={1}>{msg}</Text>
        </View>
        {/* Right: confidence + progress */}
        <View className="items-end gap-1" style={{ minWidth: 100 }}>
          <Text className="font-mono text-[10px]" style={{ color: TERM.dimGray }}>CONFIDENCE</Text>
          <Text className="font-mono text-xl font-bold" style={{ color: c.hex }}>{(bufferPercent ?? 0).toFixed(1)}%</Text>
          <View style={{ height: 6, width: 100, backgroundColor: "#132b22", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${Math.min(100, Math.max(0, bufferPercent ?? 0))}%`, backgroundColor: c.bar }} />
          </View>
        </View>
      </View>
    </View>
  );
}
