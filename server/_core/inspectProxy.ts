import type { Express } from "express";
import { ENV } from "./env";

export function registerInspectProxy(app: Express) {
  app.post("/api/inspect", async (req, res) => {
    const { audioBase64, fileName = "recording.m4a", conveyorId = "", mimeType = "audio/mp4" } =
      (req.body ?? {}) as {
        audioBase64?: string;
        fileName?: string;
        conveyorId?: string;
        mimeType?: string;
      };

    if (!audioBase64 || audioBase64.length === 0) {
      res.status(400).json({ error: "Missing audioBase64" });
      return;
    }

    if (!ENV.inferenceUrl) {
      console.error("[InspectProxy] INFERENCE_URL not configured, cannot proxy inspection");
      res.status(503).json({ error: "Inference service not configured" });
      return;
    }

    try {
      const buffer = Buffer.from(audioBase64, "base64");
      if (buffer.length === 0) {
        res.status(400).json({ error: "Empty audio payload" });
        return;
      }

      const form = new FormData();
      form.append("file", new Blob([buffer], { type: mimeType }), fileName);
      form.append("conveyor_id", conveyorId);

      const inferenceResp = await fetch(`${ENV.inferenceUrl}/inspect`, {
        method: "POST",
        body: form,
      });

      if (!inferenceResp.ok) {
        const body = await inferenceResp.text().catch(() => "");
        console.error(`[InspectProxy] inference error: ${inferenceResp.status} ${body}`);
        res.status(502).json({ error: "Inference service error" });
        return;
      }

      const result = await inferenceResp.json();
      res.json(result);
    } catch (err) {
      console.error("[InspectProxy] failed:", err);
      res.status(502).json({ error: "Inference proxy error" });
    }
  });

  app.get("/api/inspect/health", async (_req, res) => {
    if (!ENV.inferenceUrl) {
      res.json({ ok: false, reason: "INFERENCE_URL not configured" });
      return;
    }
    try {
      const inferenceResp = await fetch(`${ENV.inferenceUrl}/health`);
      const health = (await inferenceResp.json()) as Record<string, unknown>;
      res.json({ ok: true, upstream: health });
    } catch (err) {
      console.error("[InspectProxy] health check failed:", err);
      res.json({ ok: false, reason: "Inference service unreachable" });
    }
  });
}