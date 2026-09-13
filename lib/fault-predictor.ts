import type { AnalysisResult } from "@/lib/poc-analysis";

export type FaultSeverity = "OK" | "WARNING" | "CRITICAL";

export type FaultPrediction = {
  severity: FaultSeverity;
  title: string;
  label: string;
  message: string;
  anomalyPercent: number;
  barPercent: number;
};

const round = (n: number) => Math.round(n * 1000) / 10;

/**
 * Probability (%) that the sample is anomalous (the "error %").
 *
 * The backend `score` is the confidence in the *predicted* class:
 *   - predicted abnormal → P(anomaly) = score
 *   - predicted normal   → P(anomaly) = 1 - score
 *
 * Results without `predicted_class` (POC placeholder or review gate)
 * already encode `score` as an anomaly score, so it is used as-is.
 * This keeps the Live Monitor and the Inspection Result on the same
 * number no matter which source produced the result.
 */
export function anomalyPercent(result: AnalysisResult): number {
  const score = result.score ?? 0;
  if (result.predictedClass === "abnormal") return round(score);
  if (result.predictedClass === "normal") return round(1 - score);
  return round(score);
}

/**
 * Fault prediction is driven by the inspection risk level so the Live
 * Monitor always agrees with the Inspection Result:
 *   - normal   → NOMINAL, never a fault warning
 *   - review   → WARNING (below screening confidence)
 *   - critical → CRITICAL, worst-case bearing wear escalation
 */
export function predictFault(result: AnalysisResult): FaultPrediction {
  const pct = anomalyPercent(result);
  const barPercent = Math.min(100, Math.max(0, pct));

  if (result.risk === "review") {
    return {
      severity: "WARNING",
      title: "Signal Requires Review",
      label: "Confidence below screening threshold",
      message: "Retake the sample from the approved measurement point.",
      anomalyPercent: pct,
      barPercent,
    };
  }

  if (result.risk === "normal") {
    return {
      severity: "OK",
      title: "ALL SYSTEMS NOMINAL",
      label: "No fault pattern detected",
      message: "Acoustic profile is inside the normal operating envelope.",
      anomalyPercent: pct,
      barPercent,
    };
  }

  const multiBand = pct >= 85;
  return {
    severity: "CRITICAL",
    title: "Critical: Bearing Wear",
    label: multiBand ? "Multiple fault signatures" : "Bearing degradation detected",
    message: multiBand
      ? "Wideband energy with impacts; multiple mechanical stages affected."
      : "Impact energy in high-frequency bands indicates bearing deterioration.",
    anomalyPercent: pct,
    barPercent,
  };
}