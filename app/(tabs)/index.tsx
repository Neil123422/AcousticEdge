import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { TERM } from "@/components/terminal";
import { HeaderBar } from "@/components/hud/header-bar";
import { StatusBanner } from "@/components/hud/status-banner";
import { Discriminator } from "@/components/hud/discriminator";
import { HardwareArchitecture } from "@/components/hud/hardware";
import { TelemetryLog } from "@/components/hud/telemetry-log";
import { StatusFooter } from "@/components/hud/status-footer";
import { getTelemetryState, subscribeTelemetry, startMonitoring, stopMonitoring, clearLog } from "@/lib/telemetry";

export default function HomeScreen() {
  const state = getTelemetryState();
  const [monitoring, setMonitoring] = useState(state.monitoring);
  const [normalScoreV, setNormalScoreV] = useState(state.normalScore);
  const [anomalyScoreV, setAnomalyScoreV] = useState(state.anomalyScore);
  const [relay, setRelay] = useState(state.relayEngaged);
  const [log, setLog] = useState(state.log);
  const [lastAnomalyType, setLastAnomalyType] = useState(state.lastAnomalyType);
  const [lastAnomalySeverity, setLastAnomalySeverity] = useState(state.lastAnomalySeverity);
  const [normalScoreV, setNormalScoreV] = useState(state.normalScore);

  useEffect(() => subscribeTelemetry((s) => {
    setMonitoring(s.monitoring); setNormalScoreV(s.normalScore); setAnomalyScoreV(s.anomalyScore);
    setRelay(s.relayEngaged); setLog(s.log); setLastAnomalyType(s.lastAnomalyType); setLastAnomalySeverity(s.lastAnomalySeverity);
  }), []);

  useEffect(() => {
    if (!monitoring) return;
    // Nominal silence baseline: keep OK, high normal, low anomaly — no alert spam
    const id = setInterval(() => {
      setNormalScoreV(0.94 + Math.random() * 0.05);
      setAnomalyScoreV(0.01 + Math.random() * 0.05);
    }, 800);
    return () => clearInterval(id);
  }, [monitoring]);

  const confidencePercent = monitoring ? (normalScoreV > 0.5 ? normalScoreV * 100 : anomalyScoreV * 100) : 0;

  function handleToggle() {
    if (monitoring) { stopMonitoring(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
    else { startMonitoring(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  }

  return (
    <ScreenContainer className="px-3" edges={["top","left","right"]}>
      <View className="flex-1 gap-y-2" style={{ paddingBottom: 16 }}>
        <HeaderBar monitoring={monitoring} onToggle={handleToggle} disabled={false} />
          <StatusBanner live={monitoring} anomalyType={lastAnomalyType} anomalySeverity={lastAnomalySeverity} bufferPercent={confidencePercent} />
        <View className="flex-row gap-x-4">
          <View style={{ flex: 0.28, minWidth: 0 }}><Discriminator normalScore={normalScoreV} anomalyScore={anomalyScoreV} anomalyParam={lastAnomalyType} anomalySeverity={lastAnomalySeverity} /></View>
          <View style={{ flex: 0.42, minWidth: 0 }}><HardwareArchitecture /></View>
          <View style={{ flex: 0.30, minWidth: 0 }}><TelemetryLog entries={log} onClear={() => clearLog()} /></View>
        </View>
      </View>
      <StatusFooter relayEngaged={relay} monitoring={monitoring} />
    </ScreenContainer>
  );
}
