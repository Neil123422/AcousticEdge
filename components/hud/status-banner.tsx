import { useState } from "react";
import { Text, View } from "react-native";
import { TERM } from "@/components/terminal";

export type BannerState = "OK" | "ADVISORY" | "WARNING" | "CRITICAL";

export interface StatusBannerProps {
  live: boolean;
  anomalyType?: string;
  anomalySeverity?: "Low" | "Medium" | "Critical" | "Normal";
  bufferPercent?: number;
}

function getBannerState(severity?: string): BannerState {
  if (!severity || severity === "Normal") return "OK";
  if (severity === "Low") return "ADVISORY";
  if (severity === "Medium") return "WARNING";
  if (severity === "Critical") return "CRITICAL";
  return "OK";
}

function getColors(state: BannerState) {
  switch (state) {
    case "OK": return { border: "border-emerald-500", text: "text-emerald-400", hex: "#34d399", bar: TERM.green };
    case "ADVISORY": return { border: "border-yellow-500", text: "text-yellow-400", hex: "#facc15", bar: TERM.amber };
    case "WARNING": return { border: "border-orange-500", text: "text-orange-400", hex: "#fb923c", bar: "#f97316" };
    case "CRITICAL": return { border: "border-red-500", text: "text-red-500", hex: "#f87171", bar: TERM.red };
  }
}

export function StatusBanner({ live, anomalyType, anomalySeverity, bufferPercent = 0 }: StatusBannerProps) {
  const state = getBannerState(anomalySeverity);
  const c = getColors(state);

  const label = live
    ? state === "OK" ? "[ OK ] NORMAL OPERATION // NOMINAL"
      : state === "ADVISORY" ? `[ ADVISORY ] ANOMALY DETECTED // CRACKING [LOW ALERT]`
      : state === "WARNING" ? `[ WARNING ] ANOMALY DETECTED // SNAP [MEDIUM ALERT]`
      : `[ CRITICAL ] ANOMALY DETECTED // SPARK [HIGH ALERT]`
    : "[ -- ] MONITORING PAUSED // STANDBY";

  const msg = live
    ? state === "OK" ? "Continuous baseline acoustic profile nominal. No structural faults detected."
      : state === "ADVISORY" ? "> ADVISORY: Longitudinal carcass micro-fissure or surface fatigue noise identified."
      : state === "WARNING" ? "WARNING: Belt tensile snap or splice rupture transient waveform recorded."
      : "> DANGER: Spark acoustic or roller seizure friction signature identified. Auto E-Stop armed."
    : "Acoustic telemetry paused. Click [ START MONITORING ] to resume.";

  return (
    <View className={`border-2 ${c.border} rounded-none`} style={{ borderColor: c.hex, backgroundColor: live ? TERM.panelRaised : TERM.bgAlt }}>
      <View className="flex-row gap-4 px-3 py-2">
        {/* Left: headline + description */}
        <View className="flex-1">
          <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: live ? c.hex : TERM.dimGray }} numberOfLines={1}>
            {label}
          </Text>
          <Text className="mt-1 font-mono text-[10px]" style={{ color: live ? c.hex : TERM.dimGray }} numberOfLines={1}>
            {msg}
          </Text>
        </View>
        {/* Right: buffer % + progress bar */}
        <View className="items-end gap-1" style={{ minWidth: 80 }}>
          <Text className="font-mono text-xl font-bold" style={{ color: c.hex }}>
            {(bufferPercent ?? 0).toFixed(1)}%
          </Text>
          <View style={{ height: 6, width: 80, backgroundColor: "#132b22", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${Math.min(100, Math.max(0, bufferPercent ?? 0))}%`, backgroundColor: c.bar }} />
          </View>
        </View>
      </View>
    </View>
  );
}
