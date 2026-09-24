import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { TERM } from "@/components/terminal";
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

const CONVEYORS = ["CV-01 · Primary line", "CV-02 · Transfer line", "CV-03 · Packing line"];

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

/** Target selector — condensed into a single row for the one-interface HUD. */
function TargetSelect({ conveyorId, onSelect }: { conveyorId: string; onSelect: (id: string) => void }) {
  return (
    <View className="flex-row gap-x-2">
      {CONVEYORS.map((item, i) => {
        const active = item === conveyorId;
        return (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              {
                flex: 1,
                opacity: pressed ? 0.7 : 1,
                borderWidth: 1,
                borderColor: active ? TERM.green : TERM.borderDim,
                backgroundColor: active ? TERM.panelRaised : "transparent",
                paddingHorizontal: 6,
                paddingVertical: 6,
              },
            ]}
          >
            <Text className="font-mono text-[10px] font-bold" style={{ color: active ? TERM.green : TERM.dimGray }}>
              [CV-0{i + 1}]{active ? " ▸" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}



export default function HomeScreen() {
  const { monitoring, normalScoreV, anomalyScoreV, relay, log, lastAnomalyType, lastAnomalySeverity } = useTelemetry();

  const [conveyorId, setConveyorId] = useState(CONVEYORS[0]);
  const [busy, setBusy] = useState(false);

  function handleMonitoringToggle() {
    if (monitoring) {
      stopMonitoring();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      startMonitoring();
      // Auto-trigger inference loop when armed
      setBusy(true);
      setTimeout(async () => {
        try {
          // Generate synthetic data with 70% normal, 30% anomalous distribution
          const rand = Math.random();
          let risk: "normal" | "review" | "critical";
          let score: number;
          
          if (rand < 0.7) {
            // 70% normal
            risk = "normal";
            score = 0.20 + Math.random() * 0.25; // 0.20-0.45 range for normal
          } else if (rand < 0.85) {
            // 15% review
            risk = "review";
            score = 0.45 + Math.random() * 0.15; // 0.45-0.60 range for review
          } else {
            // 15% critical
            risk = "critical";
            score = 0.60 + Math.random() * 0.30; // 0.60-0.90 range for critical
          }
          
          const synthetic = {
            risk,
            score,
            signalQuality: risk === "normal" ? "Good" : "Fair",
            summary: "Synthetic telemetry stream active.",
            recommendation: "Monitor continuously.",
            model: "HUD-auto",
            features: ["Telemetry loop"],
          } as AnalysisResult;
          const anomaly = anomalyPercent(synthetic) / 100;
          const norm = normalScore(synthetic);
          seedFromResult(synthetic, norm, anomaly);
          const types: AnomalyType[] = ["Belt Tear", "Motor Sparking", "Bearing Whine", "Roller Jam"];
          const sev: AnomalySeverity[] = ["Low", "Medium", "Critical"];
          const rndSeverity = sev[Math.floor(Math.random() * sev.length)];
          const rndType = types[Math.floor(Math.random() * types.length)];
          pushInspectionLog(
            synthetic.risk === "critical" ? "CRIT" : synthetic.risk === "review" ? "WARN" : "INFO",
            `INFERENCE LOOP — ${rndType} | ${rndSeverity} — score ${synthetic.score.toFixed(2)}`
          );
        } finally {
          setBusy(false);
        }
      }, 800);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  return (
    <ScreenContainer className="px-3" edges={["top", "left", "right"]}>
      <View className="flex-1 gap-y-2" style={{ paddingBottom: 16 }}>
        <HeaderBar monitoring={monitoring} onToggle={handleMonitoringToggle} disabled={busy} />
        <StatusBanner 
          live={monitoring} 
          anomalyType={lastAnomalyType}
          anomalySeverity={lastAnomalySeverity}
        />
        <TargetSelect conveyorId={conveyorId} onSelect={setConveyorId} />
        <View className="flex-row gap-x-4">
          {/* Left Column - Acoustic Discriminator (~28%) */}
          <View style={{ flex: 0.28, minWidth: 0 }}>
            <Discriminator 
              normalScore={normalScoreV} 
              anomalyScore={anomalyScoreV}
              anomalyParam={lastAnomalyType}
              anomalySeverity={lastAnomalySeverity}
            />
          </View>
          
          {/* Center Column - Hardware Architecture (~42%) */}
          <View style={{ flex: 0.42, minWidth: 0 }}>
            <HardwareArchitecture />
          </View>
          
          {/* Right Column - Incident Telemetry Log (~30%) */}
          <View style={{ flex: 0.30, minWidth: 0 }}>
            <TelemetryLog entries={log} onClear={() => { clearLog(); Haptics.selectionAsync(); }} />
          </View>
        </View>
      </View>
      <StatusFooter relayEngaged={relay} monitoring={monitoring} />
    </ScreenContainer>
  );
}