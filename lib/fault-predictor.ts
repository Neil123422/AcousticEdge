import type { AnalysisResult } from "@/lib/poc-analysis";

export type FaultSeverity = "OK" | "WARNING" | "CRITICAL";

export type FaultPrediction = {
  severity: FaultSeverity;
  title: string;
  label: string;
  message: string;
  anomalyPercent: number;
  barPercent: number;
  normalScore: number;
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
  if (result.predictedClass === "Normal") return round(1 - score);
  if (["Idler Bearing Failure", "Belt Slip Friction", "Splice Failure Belt Tear"].includes(result.predictedClass as string)) return round(score);
  return round(score);
}

/** Fraction 0..1 that the sample is NORMAL (complement of anomaly). */
export function normalScore(result: AnalysisResult): number {
  const anomaly = anomalyPercent(result);
  return Math.min(99.9, Math.max(0, 100 - anomaly)) / 100;
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
      normalScore: normalScore(result),
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
      normalScore: normalScore(result),
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
    normalScore: normalScore(result),
  };
}