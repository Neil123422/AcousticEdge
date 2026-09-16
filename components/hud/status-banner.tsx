import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { TERM } from "@/components/terminal";

const BAR_ROWS: number[][] = [
  [6, 14, 9, 20, 12, 24, 16, 18, 10, 22, 8, 26, 14, 20, 12, 16, 18, 10],
  [10, 18, 12, 22, 16, 28, 20, 14, 16, 26, 12, 20, 18, 24, 10, 14, 22, 16],
  [14, 22, 18, 26, 20, 30, 22, 18, 20, 28, 16, 24, 20, 26, 14, 18, 24, 20],
  [8, 16, 10, 18, 12, 22, 14, 12, 10, 18, 8, 16, 12, 18, 8, 12, 16, 10],
];

type AnomalySeverity = "Normal" | "Low" | "Medium" | "Critical";

function getSeverityColors(severity: AnomalySeverity) {
  switch (severity) {
    case "Critical":
      return { border: "border-red-500", textClass: "text-red-500", textColor: TERM.red, bar: TERM.red, barDim: TERM.redDim };
    case "Medium":
      return { border: "border-orange-500", textClass: "text-orange-500", textColor: TERM.amber, bar: TERM.amber, barDim: TERM.amberDim };
    case "Low":
      return { border: "border-yellow-400", textClass: "text-yellow-400", textColor: TERM.amber, bar: TERM.amber, barDim: TERM.amberDim };
    case "Normal":
    default:
      return { border: "border-green-500", textClass: "text-green-500", textColor: TERM.green, bar: TERM.green, barDim: TERM.greenDim };
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
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

function Waveform({ active, severity }: { active: boolean; severity: AnomalySeverity }) {
  const [tick, setTick] = useState(0);
  const colors = getSeverityColors(severity);
  
  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 140);
    return () => clearInterval(id);
  }, [active]);

  const row = BAR_ROWS[tick % BAR_ROWS.length];
  return (
    <View className="flex-row items-end justify-between gap-x-0.5" style={{ height: 30 }}>
      {row.map((h, i) => {
        const lit = (tick + i) % 4 === 0;
        return (
          <View
            key={`${i}-${tick}`}
            className="w-[3px]"
            style={{
              height: active ? h : 6,
              backgroundColor: lit ? colors.bar : active ? colors.barDim : TERM.borderDim,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Primary stream status banner with dynamic severity-based coloring and live timer.
 */
export function StatusBanner({ 
  live, 
  anomalyType,
  anomalySeverity
}: { 
  live: boolean; 
  anomalyType?: string;
  anomalySeverity?: "Low" | "Medium" | "Critical" | "Normal";
}) {
  const severity = live ? (anomalySeverity ?? "Normal") : "Normal";
  const colors = getSeverityColors(severity);
  const showAnomaly = live && anomalyType && severity !== "Normal";
  const formattedAnomaly = formatAnomalyType(anomalyType, severity);

  // Timer state - persists across stops, only resets on new monitoring session
  const [elapsed, setElapsed] = useState(0);
  const [wasLive, setWasLive] = useState(false);
  
  useEffect(() => {
    // Reset timer only when starting a NEW monitoring session (false -> true transition)
    if (live && !wasLive) {
      setElapsed(0);
    }
    setWasLive(live);
    
    if (!live) {
      return; // Keep elapsed time when stopped
    }
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [live]);

  const timerText = formatTime(elapsed);
  const anomalyLabel = showAnomaly ? `${formattedAnomaly} (Severity: ${severity})` : null;
  const rightLabel = anomalyLabel ? `${anomalyLabel} | ${timerText}` : timerText;

  return (
    <View
      className={colors.border}
      style={{
        borderWidth: 2,
        backgroundColor: live ? TERM.panelRaised : TERM.bgAlt,
      }}
    >
      <View className="flex-row items-center justify-between px-3 py-2">
        <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: severity === "Normal" ? TERM.green : colors.textColor }}>
          [ {live ? "LIVE" : "--"} ]
        </Text>
        <Text className="flex-1 pl-2 font-mono text-xs font-bold tracking-widest" style={{ color: severity === "Normal" ? TERM.text : colors.textColor }}>
          {showAnomaly ? `DETECTED: ${formattedAnomaly}` : live ? "STREAM ACTIVE" : "STANDBY // AUDIO STREAM OFFLINE"}
        </Text>
        <Text className={`font-mono text-xs font-bold ${colors.textClass}`}>
          {rightLabel}
        </Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: colors.bar }} className="px-3 pb-2">
        <Waveform active={live} severity={severity} />
        <Text className="mt-1 font-mono text-[10px]" style={{ color: severity === "Normal" ? TERM.greenMuted : colors.bar }}>
          {showAnomaly 
            ? `> ${formattedAnomaly} signature detected @ 16.0 kHz`
            : live 
              ? "> ingesting I2S capture buffers @ 16.0 kHz" 
              : "> press [ START MONITORING ] to initialize I2S capture buffers."}
        </Text>
      </View>
    </View>
  );
}