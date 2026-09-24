import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { TERM } from "@/components/terminal";

export type BannerState = "OK" | "ADVISORY" | "WARNING" | "CRITICAL";

export interface StatusBannerProps {
  live: boolean;
  anomalyType?: string;
  anomalySeverity?: "Low" | "Medium" | "Critical" | "Normal";
  bufferPercent?: number;
}

function getBannerState(
  severity: "Low" | "Medium" | "Critical" | "Normal" | undefined
): BannerState {
  if (!severity || severity === "Normal") return "OK";
  if (severity === "Low") return "ADVISORY";
  if (severity === "Medium") return "WARNING";
  if (severity === "Critical") return "CRITICAL";
  return "OK";
}

function getStateColors(state: BannerState) {
  switch (state) {
    case "OK":
      return {
        border: "border-emerald-500",
        textClass: "text-emerald-400",
        hex: "#34d399",
        bar: TERM.green,
        barDim: TERM.greenDim,
      };
    case "ADVISORY":
      return {
        border: "border-yellow-500",
        textClass: "text-yellow-400",
        hex: "#facc15",
        bar: TERM.amber,
        barDim: TERM.amberDim,
      };
    case "WARNING":
      return {
        border: "border-orange-500",
        textClass: "text-orange-400",
        hex: "#fb923c",
        bar: "#f97316",
        barDim: "#7c2d12",
      };
    case "CRITICAL":
      return {
        border: "border-red-500",
        textClass: "text-red-500",
        hex: "#f87171",
        bar: TERM.red,
        barDim: TERM.redDim,
      };
  }
}

function getAnomalyTag(state: BannerState, anomalyType?: string): string {
  if (anomalyType) {
    const upper = anomalyType.toUpperCase();
    if (upper.includes("SPARK")) return "SPARK";
    if (upper.includes("SNAP") || upper.includes("TEAR")) return "SNAP";
    if (upper.includes("CRACK") || upper.includes("WHINE") || upper.includes("JAM")) return "CRACKING";
    return upper;
  }
  switch (state) {
    case "ADVISORY": return "CRACKING";
    case "WARNING": return "SNAP";
    case "CRITICAL": return "SPARK";
    default: return "";
  }
}

function getStateLabel(state: BannerState, live: boolean, anomalyType?: string): string {
  if (!live) return "[ -- ] MONITORING PAUSED // STANDBY";
  const tag = getAnomalyTag(state, anomalyType);
  switch (state) {
    case "OK":
      return "[ OK ] NORMAL OPERATION // NOMINAL";
    case "ADVISORY":
      return `[ ADVISORY ] ANOMALY DETECTED // ${tag || "CRACKING"} [LOW ALERT]`;
    case "WARNING":
      return `[ WARNING ] ANOMALY DETECTED // ${tag || "SNAP"} [MEDIUM ALERT]`;
    case "CRITICAL":
      return `[ CRITICAL ] ANOMALY DETECTED // ${tag || "SPARK"} [HIGH ALERT]`;
  }
}

function getStateMessage(state: BannerState, live: boolean): string {
  if (!live) {
    return "Acoustic telemetry paused. Click [ START MONITORING ] to resume.";
  }
  switch (state) {
    case "OK":
      return "Continuous baseline acoustic profile nominal. No structural faults detected.";
    case "ADVISORY":
      return "> ADVISORY: Longitudinal carcass micro-fissure or surface fatigue noise identified.";
    case "WARNING":
      return "WARNING: Belt tensile snap or splice rupture transient waveform recorded.";
    case "CRITICAL":
      return "> DANGER: Spark acoustic or roller seizure friction signature identified. Auto E-Stop armed.";
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function Waveform({
  active,
  barColor,
  barDimColor,
}: {
  active: boolean;
  barColor: string;
  barDimColor: string;
}) {
  const BAR_ROWS: number[][] = [
    [6, 14, 9, 20, 12, 24, 16, 18, 10, 22, 8, 26, 14, 20, 12, 16, 18, 10],
    [10, 18, 12, 22, 16, 28, 20, 14, 16, 26, 12, 20, 18, 24, 10, 14, 22, 16],
    [14, 22, 18, 26, 20, 30, 22, 18, 20, 28, 16, 24, 20, 26, 14, 18, 24, 20],
    [8, 16, 10, 18, 12, 22, 14, 12, 10, 18, 8, 16, 12, 18, 8, 12, 16, 10],
  ];

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 140);
    return () => clearInterval(id);
  }, [active]);

  const row = BAR_ROWS[tick % BAR_ROWS.length];
  return (
    <View
      className="flex-row items-end justify-between gap-x-0.5"
      style={{ height: 26, width: 80 }}
    >
      {row.map((h, i) => {
        const lit = (tick + i) % 4 === 0;
        return (
          <View
            key={`${i}-${tick}`}
            className="w-[3px]"
            style={{
              height: active ? h : 4,
              backgroundColor: lit ? barColor : active ? barDimColor : TERM.borderDim,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Primary stream status banner with dynamic states and buffer gauge.
 */
export function StatusBanner({
  live,
  anomalyType,
  anomalySeverity,
  bufferPercent = 0,
}: StatusBannerProps) {
  const state = getBannerState(anomalySeverity);
  const colors = getStateColors(state);

  const [elapsed, setElapsed] = useState(0);
  const [prevLive, setPrevLive] = useState(live);

  // Synchronize timer reset during render phase to comply with React 19 rules
  if (live !== prevLive) {
    setPrevLive(live);
    if (live) {
      setElapsed(0);
    }
  }

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [live]);

  const timerText = formatTime(elapsed);

  return (
    <View
      className={colors.border}
      style={{
        borderWidth: 2,
        borderColor: colors.hex,
        backgroundColor: live ? TERM.panelRaised : TERM.bgAlt,
      }}
    >
      {/* Top row: Status tag on left, Timer and Buffer Gauge on right */}
      <View className="flex-row items-center justify-between px-3 py-2">
        <Text
          className="font-mono text-xs font-bold tracking-widest flex-1 pr-2"
          style={{ color: live ? colors.hex : TERM.dimGray }}
          numberOfLines={1}
        >
          {getStateLabel(state, live, anomalyType)}
        </Text>

        <View className="flex-row items-center gap-x-3">
          {live && (
            <Text
              className="font-mono text-[10px] tracking-wider"
              style={{ color: TERM.dimGray }}
            >
              {timerText}
            </Text>
          )}
          <Text
            className="font-mono text-xs font-bold tracking-widest"
            style={{ color: live ? colors.hex : TERM.greenDim }}
          >
            {(bufferPercent ?? 0).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Bottom row: Sub-header prompt message + Audio Waveform visualizer */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: colors.barDim,
        }}
        className="flex-row items-center justify-between px-3 py-1.5"
      >
        <Text
          className="flex-1 font-mono text-[10px] pr-2"
          style={{
            color: state === "OK" && live ? TERM.greenMuted : colors.hex,
          }}
          numberOfLines={1}
        >
          {getStateMessage(state, live)}
        </Text>

        <Waveform
          active={live}
          barColor={colors.bar}
          barDimColor={colors.barDim}
        />
      </View>
    </View>
  );
}