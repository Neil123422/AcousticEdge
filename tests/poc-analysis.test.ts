import { describe, expect, it } from "vitest";

import { analyzeRecording, formatRisk } from "../lib/poc-analysis";

describe("POC acoustic analysis", () => {
  it("asks for a re-recording when the sample is too short", () => {
    const result = analyzeRecording({ durationSeconds: 1, hasUri: true, conveyorId: "CV-01" });
    expect(result.risk).toBe("review");
    expect(result.signalQuality).toBe("Needs review");
    expect(result.recommendation).toContain("at least 10 seconds");
  });

  it("returns a normal baseline status for a low-deviation sample", () => {
    const result = analyzeRecording({ durationSeconds: 10, hasUri: true, conveyorId: "CV-01" });
    expect(result.risk).toBe("normal");
    expect(result.score).toBeLessThan(0.42);
    expect(formatRisk(result.risk)).toBe("NORMAL");
  });

  it("returns critical for a high-deviation sample", () => {
    const result = analyzeRecording({ durationSeconds: 17, hasUri: true, conveyorId: "CV-02" });
    expect(result.risk).toBe("critical");
    expect(result.score).toBeGreaterThanOrEqual(0.7);
    expect(formatRisk(result.risk)).toBe("CRITICAL");
  });
});
