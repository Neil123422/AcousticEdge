import { File } from "expo-file-system";
import { apiCall } from "./_core/api";
import type { AnalysisResult } from "./poc-analysis";

type InferenceResponse = {
  risk: "normal" | "review" | "critical";
  score: number;
  signalQuality: "Good" | "Fair" | "Needs review";
  summary: string;
  recommendation: string;
  model: string;
  model_version?: string;
  features: string[];
  predicted_class?: "Normal" | "Idler Bearing Failure" | "Belt Slip Friction" | "Splice Failure Belt Tear";
  anomalyType?: "Idler Bearing Failure" | "Belt Slip Friction" | "Splice Failure Belt Tear";
  severity?: "Normal" | "Low" | "Medium" | "Critical";
};

/**
 * Upload a recorded inspection sample to the Express /inspect proxy,
 * which forwards to the Python inference service.
 *
 * No local placeholder fallback: if the tunnel/proxy is unreachable the
 * real error propagates to the caller so the failure is visible instead
 * of being masked by a fake POC score.
 */
export async function inspectRecording(input: {
  uri: string | null;
  durationSeconds: number;
  conveyorId: string;
}): Promise<AnalysisResult> {
  if (!input.uri) {
    throw new Error("No recording URI available — nothing to inspect.");
  }

  const file = new File(input.uri);
  if (!file.exists) {
    throw new Error(`Recording file not found on device: ${input.uri}`);
  }

  const audioBase64 = await file.base64();

  const response = await apiCall<InferenceResponse>("/api/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64,
      fileName: input.uri.split("/").pop(),
      conveyorId: input.conveyorId,
      mimeType: "audio/mp4",
    }),
  });

  return {
    risk: response.risk,
    score: response.score,
    signalQuality: response.signalQuality,
    summary: response.summary,
    recommendation: response.recommendation,
    model: response.model_version ?? response.model,
    features: response.features,
    predictedClass: response.predicted_class,
    anomalyType: response.anomalyType,
    severity: response.severity,
  };
}