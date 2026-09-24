import { useEffect, useState } from "react";
import { View } from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { HeaderBar } from "@/components/hud/header-bar";
import { StatusBanner } from "@/components/hud/status-banner";
import { Discriminator } from "@/components/hud/discriminator";
import { HardwareArchitecture } from "@/components/hud/hardware";
import { TelemetryLog } from "@/components/hud/telemetry-log";
import { StatusFooter } from "@/components/hud/status-footer";
import { anomalyPercent, normalScore } from "@/lib/fault-predictor";
import { type AnalysisResult } from "@/lib/poc-analysis";
import {
  clearLog,
  getTelemetryState,
  pushInspectionLog,
  seedFromResult,
  startMonitoring,
  stopMonitoring,
  subscribeTelemetry,
  type IncidentEntry,
  type AnomalyType,
  type AnomalySeverity,
} from "@/lib/telemetry";

function useTelemetry() {
  const state = getTelemetryState();
  const [monitoring, setMonitoring] = useState(state.monitoring);
  const [normalScoreV, setNormalScoreV] = useState(state.normalScore);
  const [anomalyScoreV, setAnomalyScoreV] = useState(state.anomalyScore);
  const [relay, setRelay] = useState(state.relayEngaged);
  const [log, setLog] = useState<IncidentEntry[]>(state.log);
  const [lastAnomalyType, setLastAnomalyType] = useState<AnomalyType | undefined>(state.lastAnomalyType);
  const [lastAnomalySeverity, setLastAnomalySeverity] = useState<AnomalySeverity | undefined>(state.lastAnomalySeverity);

  useEffect(() => {
    return subscribeTelemetry((s) => {
      setMonitoring(s.monitoring);
      setNormalScoreV(s.normalScore);
      setAnomalyScoreV(s.anomalyScore);
      setRelay(s.relayEngaged);
      setLog(s.log);
      setLastAnomalyType(s.lastAnomalyType);
      setLastAnomalySeverity(s.lastAnomalySeverity);
    });
  }, []);

  return { monitoring, normalScoreV, anomalyScoreV, relay, log, lastAnomalyType, lastAnomalySeverity };
}

export default function HomeScreen() {
  const {
    monitoring,
    normalScoreV,
    anomalyScoreV,
    relay,
    log,
    lastAnomalyType,
    lastAnomalySeverity,
  } = useTelemetry();

  const [busy, setBusy] = useState(false);
  const [bufferPercent, setBufferPercent] = useState(0);

  // Live buffer gauge simulation (fluctuates between 75% and 99% while streaming)
  useEffect(() => {
    if (!monitoring) {
      setBufferPercent(0);
      return;
    }
    const id = setInterval(() => {
      setBufferPercent(+(75 + Math.random() * 24).toFixed(1));
    }, 400);
    return () => clearInterval(id);
  }, [monitoring]);

  // Periodic telemetry log loop while monitoring is live
  useEffect(() => {
    if (!monitoring) return;

    const interval = setInterval(() => {
      generateTelemetryEvent();
    }, 3600);

    return () => clearInterval(interval);
  }, [monitoring]);

  function generateTelemetryEvent() {
    const modes: {
      type: AnomalyType;
      signature: "SPARK" | "SNAP" | "CRACKING";
      severity: AnomalySeverity;
      level: "INFO" | "WARN" | "CRIT";
      score: number;
    }[] = [
      { type: "Motor Sparking", signature: "SPARK", severity: "Critical", level: "CRIT", score: 0.89 },
      { type: "Belt Tear", signature: "SNAP", severity: "Medium", level: "WARN", score: 0.62 },
      { type: "Bearing Whine", signature: "CRACKING", severity: "Low", level: "INFO", score: 0.28 },
    ];

    // 40% probability of anomaly generation, 60% nominal profile
    const isAnomaly = Math.random() < 0.4;

    if (!isAnomaly) {
      const score = +(0.08 + Math.random() * 0.15).toFixed(2);
      const synthetic = {
        risk: "normal",
        score,
        signalQuality: "Good",
        summary: "Continuous baseline acoustic profile nominal.",
        recommendation: "Routine monitoring active.",
        model: "audio-cnn-v2",
        features: ["I2S capture buffer"],
      } as AnalysisResult;

      seedFromResult(synthetic, normalScore(synthetic), anomalyPercent(synthetic) / 100);
    } else {
      const selected = modes[Math.floor(Math.random() * modes.length)];
      const synthetic = {
        risk: selected.severity === "Critical" ? "critical" : selected.severity === "Medium" ? "review" : "normal",
        score: selected.score,
        signalQuality: "Fair",
        summary: `${selected.signature} anomaly detected.`,
        recommendation: "Inspect belt and roller assemblies.",
        model: "audio-cnn-v2",
        features: [selected.type],
      } as AnalysisResult;

      seedFromResult(synthetic, normalScore(synthetic), anomalyPercent(synthetic) / 100);

      // Pushes exact signature tag to match the video format
      pushInspectionLog(
        selected.level,
        selected.signature,
        selected.type,
        selected.severity
      );
    }
  }

  function handleMonitoringToggle() {
    if (monitoring) {
      stopMonitoring();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      startMonitoring();
      setBusy(true);

      // Trigger immediate initial evaluation on arming
      setTimeout(() => {
        try {
          generateTelemetryEvent();
        } finally {
          setBusy(false);
        }
      }, 600);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  return (
    <ScreenContainer className="px-3" edges={["top", "left", "right"]}>
      <View className="flex-1 gap-y-2" style={{ paddingBottom: 12 }}>
        <HeaderBar
          monitoring={monitoring}
          onToggle={handleMonitoringToggle}
          disabled={busy}
        />

        <StatusBanner
          live={monitoring}
          anomalyType={lastAnomalyType}
          anomalySeverity={lastAnomalySeverity}
          bufferPercent={bufferPercent}
        />

        {/* 3-Column Grid: Discriminator (28%), Hardware (42%), Telemetry Log (30%) */}
        <View className="flex-row gap-x-2.5 flex-1 min-h-0">
          <View style={{ flex: 0.28, minWidth: 0 }}>
            <Discriminator
              normalScore={normalScoreV}
              anomalyScore={anomalyScoreV}
              anomalyParam={lastAnomalyType}
              anomalySeverity={lastAnomalySeverity}
            />
          </View>

          <View style={{ flex: 0.42, minWidth: 0 }}>
            <HardwareArchitecture />
          </View>

          <View style={{ flex: 0.30, minWidth: 0 }}>
            <TelemetryLog
              entries={log}
              onClear={() => {
                clearLog();
                Haptics.selectionAsync();
              }}
            />
          </View>
        </View>
      </View>

      <StatusFooter relayEngaged={relay} monitoring={monitoring} />
    </ScreenContainer>
  );
}