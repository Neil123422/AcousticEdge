import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { TermGauge, TermLine, TermPanel, TermStat, TERM, toneColor } from "@/components/terminal";
import { predictFault, type FaultPrediction } from "@/lib/fault-predictor";
import type { AnalysisResult } from "@/lib/poc-analysis";

const BAR_ROWS: number[][] = [
  [6, 14, 9, 20, 12, 24, 16, 18, 10, 22, 8, 26, 14, 20, 12, 16, 18, 10],
  [10, 18, 12, 22, 16, 28, 20, 14, 16, 26, 12, 20, 18, 24, 10, 14, 22, 16],
  [14, 22, 18, 26, 20, 30, 22, 18, 20, 28, 16, 24, 20, 26, 14, 18, 24, 20],
  [8, 16, 10, 18, 12, 22, 14, 12, 10, 18, 8, 16, 12, 18, 8, 12, 16, 10],
];

function LiveFeed({ active }: { active: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 160);
    return () => clearInterval(id);
  }, [active]);

  const row = BAR_ROWS[tick % BAR_ROWS.length];
  return (
    <View>
      <View className="flex-row items-end justify-between gap-x-0.5" style={{ height: 34 }}>
        {row.map((h, i) => {
          const activeBar = (tick + i) % 4 === 0;
          return (
            <View
              key={`${i}-${tick}`}
              className="w-[3px]"
              style={{
                height: active ? h : 6,
                backgroundColor: activeBar ? TERM.green : active ? TERM.greenDim : TERM.borderDim,
              }}
            />
          );
        })}
      </View>
      <View style={{ borderTopWidth: 1, borderColor: TERM.borderDim, marginTop: 6 }} />
    </View>
  );
}

function FaultPane({ prediction }: { prediction: FaultPrediction }) {
  const tone = prediction.severity === "OK" ? "green" : prediction.severity === "WARNING" ? "amber" : "red";
  return (
    <View>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-mono text-xs tracking-widest" style={{ color: TERM.greenMuted }}>
          FAULT PREDICTION
        </Text>
        <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: toneColor[tone] }}>{prediction.title}</Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: toneColor[tone], marginTop: 8, marginBottom: 8 }} />
      <TermGauge pct={prediction.barPercent} tone={tone} width={20} />
      <View className="mt-2">
        <TermLine tone="text" spacing>{prediction.label}</TermLine>
        <TermLine tone="dim" spacing>{prediction.message}</TermLine>
      </View>
    </View>
  );
}

export function LiveMonitor({
  recording,
  busy,
  result,
  durationSeconds,
}: {
  recording: boolean;
  busy: boolean;
  result: AnalysisResult | null;
  durationSeconds: number;
}) {
  const prediction = result ? predictFault(result) : null;
  const scanning = busy && !result;
  const live = recording || scanning;

  const mm = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const ss = String(durationSeconds % 60).padStart(2, "0");

  return (
    <TermPanel title="LIVE ACOUSTIC MONITOR" tone={live ? "green" : "dim"}>
      {recording ? <LiveFeed active /> : scanning ? <LiveFeed active={false} /> : null}

      {!live && !prediction ? (
        <TermLine tone="dim">no feed — start an inspection to begin tracking.</TermLine>
      ) : null}

      <View className="mt-3 gap-y-2">
        <TermStat
          label="run"
          value={live ? `00:${mm}:${ss} · streaming` : "idle"}
          tone={live ? "green" : "dim"}
        />
        <TermStat
          label="amp"
          value={recording ? "sampling waveform…" : scanning ? "ANALYZING…" : "STANDBY"}
          tone={recording ? "red" : scanning ? "amber" : "dim"}
        />
        <TermStat
          label="conf"
          value={!recording && prediction ? `${prediction.anomalyPercent}%` : "—"}
          tone={!recording && prediction ? (prediction.severity === "OK" ? "green" : prediction.severity === "WARNING" ? "amber" : "red") : "dim"}
        />
      </View>

      {!recording && prediction ? <FaultPane prediction={prediction} /> : null}
    </TermPanel>
  );
}