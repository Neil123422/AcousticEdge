export type RiskLevel = "normal" | "review" | "critical";

export type AnalysisResult = {
  risk: RiskLevel;
  score: number;
  signalQuality: "Good" | "Fair" | "Needs review";
  summary: string;
  recommendation: string;
  model: string;
  features: string[];
  predictedClass?: "normal" | "abnormal";
};

export type LogEntry = {
  code: string;
  parameter: string;
  message: string;
};

/**
 * Build a maintenance log entry from an analysis result.
 *
 * With the current 2-class model the entry can only state normal vs abnormal
 * operation. `parameter` is the reserved fault-type slot ("belt", "roller",
 * "gearbox"...); it reads "unknown" until a fault-typed dataset is available.
 */
export function buildLogEntry(result: AnalysisResult, conveyorId: string): LogEntry {
  const target = conveyorId.split("·")[0].trim();
  if (result.risk === "normal") {
    return {
      code: "OPS-NORMAL",
      parameter: "none",
      message: `Normal operation on ${target} — no rupture indicators recorded.`,
    };
  }
  if (result.risk === "critical") {
    return {
      code: "OPS-ANOMALY",
      parameter: result.predictedClass === "abnormal" ? "unclassified" : "unknown",
      message: `Potential ${result.predictedClass === "abnormal" ? "anomalous" : "unknown"} pattern on ${target} — possible <parameter> type rupture. Parameter classification pending fault-typed dataset.`,
    };
  }
  return {
    code: "OPS-REVIEW",
    parameter: "unknown",
    message: `Review required on ${target} — signal below screening confidence, no rupture confirmed yet.`,
  };
}

/**
 * POC-only deterministic scoring layer.
 *
 * Until a conveyor-specific model is trained, this keeps the demo honest:
 * the app proves the capture -> validation -> decision workflow without
 * pretending that a real neural model has already been validated.
 */
export function analyzeRecording(input: {
  durationSeconds: number;
  hasUri: boolean;
  conveyorId: string;
}): AnalysisResult {
  const duration = Math.round(input.durationSeconds);

  if (!input.hasUri || duration < 3) {
    return {
      risk: "review",
      score: 0.52,
      signalQuality: "Needs review",
      summary: "The sample is too short for a reliable screening result.",
      recommendation: "Record at least 10 seconds from the safe measurement point.",
      model: "POC workflow gate",
      features: ["Duration check", "Recording URI check"],
    };
  }

  const score = Math.min(0.91, Math.max(0.08, 0.18 + (duration % 10) * 0.08));
  const risk: RiskLevel = score >= 0.7 ? "critical" : score >= 0.42 ? "review" : "normal";

  if (risk === "critical") {
    return {
      risk,
      score,
      signalQuality: "Good",
      summary: `A strong deviation was detected in the ${input.conveyorId} sample.`,
      recommendation: "Follow the approved plant safety and inspection procedure.",
      model: "POC anomaly-score placeholder",
      features: ["Log-mel spectrogram planned", "Window aggregation", "Threshold decision"],
    };
  }

  if (risk === "review") {
    return {
      risk,
      score,
      signalQuality: "Fair",
      summary: `The ${input.conveyorId} sample differs from its expected normal profile.`,
      recommendation: "Repeat the test and schedule a maintenance inspection if repeated.",
      model: "POC anomaly-score placeholder",
      features: ["Log-mel spectrogram planned", "MFCC baseline planned", "Threshold decision"],
    };
  }

  return {
    risk,
    score,
    signalQuality: "Good",
    summary: `The ${input.conveyorId} sample is consistent with the current normal baseline.`,
    recommendation: "Continue routine monitoring and retain this sample for calibration.",
    model: "POC anomaly-score placeholder",
    features: ["Log-mel spectrogram planned", "Normal-profile comparison", "Threshold decision"],
  };
}

export function formatRisk(risk: RiskLevel) {
  return risk === "normal" ? "NORMAL" : risk === "review" ? "REVIEW" : "CRITICAL";
}
