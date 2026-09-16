/**
 * Telemetry engine — synthetic normal/anomaly score streamer
 * for the HUD's real-time discriminator meters and incident log.
 *
 * When monitoring is active this emits fake MQTT-style packets
 * at ~5 Hz. The bars are seeded from the last real inference
 * result (class_probs or anomalyPercent) and then jitter around
 * that baseline. When anomaly_score crosses 0.70 the incident
 * log records a warning + relay trip entry.
 */

import type { AnalysisResult } from "@/lib/poc-analysis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TelemetryPacket = {
  normal_score: number;
  anomaly_score: number;
  timestamp: number;
};

export type AnomalySeverity = "Normal" | "Low" | "Medium" | "Critical";
export type AnomalyType = "Belt Tear" | "Motor Sparking" | "Bearing Whine" | "Roller Jam" | "Idler Bearing Failure" | "Belt Slip Friction" | "Splice Failure Belt Tear";

export type IncidentEntry = {
  id: string;
  ts: string;
  level: "INFO" | "WARN" | "CRIT";
  message: string;
  anomalyType?: AnomalyType;
  severity?: AnomalySeverity;
};

export type TelemetryState = {
  monitoring: boolean;
  normalScore: number;
  anomalyScore: number;
  packetCount: number;
  relayEngaged: boolean;
  log: IncidentEntry[];
  lastAnomalyType?: AnomalyType;
  lastAnomalySeverity?: AnomalySeverity;
};

export type TelemetryListener = (state: TelemetryState) => void;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _state: TelemetryState = {
  monitoring: false,
  normalScore: 0,
  anomalyScore: 0,
  packetCount: 0,
  relayEngaged: false,
  log: [],
  lastAnomalyType: undefined,
  lastAnomalySeverity: undefined,
};

const _listeners = new Set<TelemetryListener>();
let _interval: ReturnType<typeof setInterval> | null = null;
let _lastSeed: number = 0; // baseline anomaly score from last real inference

// Debounce state for E-Stop - requires sustained anomaly above threshold
let _aboveThresholdCount = 0;
const THRESHOLD_DWELL_PACKETS = 8; // 8 packets * 200ms = 1.6 seconds sustained anomaly

// Dynamic seed drift for more realistic telemetry
let _currentSeed: number = 0.15;
let _seedDirection: number = 1;
let _assignedAnomalyType: AnomalyType | undefined = undefined;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getTelemetryState(): TelemetryState {
  return { ..._state, log: [..._state.log] };
}

export function subscribeTelemetry(fn: TelemetryListener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Start the simulated telemetry stream. */
export function startMonitoring(): void {
  if (_state.monitoring) return;

  // Reset dynamic seed for new monitoring session
  _currentSeed = 0.15;
  _seedDirection = 1;
  _aboveThresholdCount = 0;

  _state = {
    ..._state,
    monitoring: true,
    packetCount: 0,
    relayEngaged: false,
    lastAnomalyType: undefined,
    lastAnomalySeverity: undefined,
    log: _state.log.length === 0
      ? [{ id: "0", ts: fmtTs(), level: "INFO", message: "System initialized. Awaiting acoustic telemetry..." }]
      : _state.log,
  };

  _notify();
  _interval = setInterval(_tick, 200); // ~5 Hz
}

/** Stop the simulated telemetry stream. */
export function stopMonitoring(): void {
  if (!_state.monitoring) return;
  if (_interval) { clearInterval(_interval); _interval = null; }

  _pushLog("INFO", "Monitoring paused by operator.");
  _state = { ..._state, monitoring: false, relayEngaged: false };
  _notify();
}

/**
 * Seed the telemetry baseline from a real inference result.
 * Called by the HUD after a successful inspection so the
 * live bars reflect the last real measurement.
 */
export function seedFromResult(result: AnalysisResult, normalScore: number, anomalyScore: number): void {
  _lastSeed = anomalyScore;
  _state = {
    ..._state,
    normalScore,
    anomalyScore,
  };
  _notify();
}

/** Append a real inspection log entry. */
export function pushInspectionLog(level: "INFO" | "WARN" | "CRIT", message: string, anomalyType?: AnomalyType, severity?: AnomalySeverity): void {
  _pushLog(level, message, anomalyType, severity);
}

/** Clear the incident log. */
export function clearLog(): void {
  _state = { ..._state, log: [] };
  _notify();
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _tick(): void {
  if (!_state.monitoring) return;

  // Dynamic seed drift - baseline anomaly score drifts naturally
  const drift = (_seedDirection * 0.002) + (Math.random() - 0.5) * 0.003;
  _currentSeed = Math.min(0.95, Math.max(0.05, _currentSeed + drift));
  
  // Randomly flip direction occasionally for more realistic behavior
  if (Math.random() < 0.02) {
    _seedDirection *= -1;
  }

  const jitter = (Math.random() - 0.5) * 0.08; // ±4 %
  const anomaly = Math.min(0.99, Math.max(0.01, _currentSeed + jitter));
  const normal = +(1 - anomaly).toFixed(4);

  // Severity tiers for UI: Normal (<0.15) = safe/green, Low (0.15-0.45) = predicted/yellow,
  // Medium (0.45-0.70) = warning/orange, Critical (>0.70) = guaranteed/red
  let currentSeverity: AnomalySeverity = "Normal";
  if (anomaly > 0.70) currentSeverity = "Critical";
  else if (anomaly > 0.45) currentSeverity = "Medium";
  else if (anomaly > 0.15) currentSeverity = "Low";

  // Dynamic parameter assignment - assign once at 45% threshold, clear when below
  const types: AnomalyType[] = ["Belt Tear", "Motor Sparking", "Bearing Whine", "Roller Jam"];
  if (anomaly >= 0.45 && !_assignedAnomalyType) {
    _assignedAnomalyType = types[Math.floor(Math.random() * types.length)];
  } else if (anomaly < 0.45) {
    _assignedAnomalyType = undefined;
  }
  
  const currentAnomalyType = _assignedAnomalyType;

  _state = {
    ..._state,
    normalScore: +normal.toFixed(4),
    anomalyScore: +anomaly.toFixed(4),
    packetCount: _state.packetCount + 1,
    lastAnomalyType: currentAnomalyType,
    lastAnomalySeverity: currentSeverity === "Normal" ? undefined : currentSeverity,
  };

  // E-Stop threshold with dwell/persistence requirement
  if (anomaly > 0.70) {
    _aboveThresholdCount++;
  } else {
    _aboveThresholdCount = 0; // Reset counter when below threshold
  }

  if (_aboveThresholdCount >= THRESHOLD_DWELL_PACKETS && !_state.relayEngaged) {
    _state = { ..._state, relayEngaged: true };
    _pushLog("WARN", `* ANOMALY SCORE ${anomaly.toFixed(2)} > 0.70 THRESHOLD (sustained ${THRESHOLD_DWELL_PACKETS * 200}ms)`);
    _pushLog("CRIT", "* RELAY TRIP — OPTICAL INTERLOCK ENGAGED — E-STOP", "Bearing Whine", "Critical");
  }

  if (anomaly <= 0.65 && _state.relayEngaged) {
    _state = { ..._state, relayEngaged: false };
    _aboveThresholdCount = 0; // Clear dwell counter on relay clear
    _pushLog("INFO", "* Anomaly score below hysteresis — relay cleared.");
  }

  _notify();
}

function _pushLog(level: "INFO" | "WARN" | "CRIT", message: string, anomalyType?: AnomalyType, severity?: AnomalySeverity): void {
  const entry: IncidentEntry = { 
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6), 
    ts: fmtTs(), 
    level, 
    message,
    anomalyType,
    severity
  };
  _state = { 
    ..._state, 
    log: [..._state.log, entry].slice(-100),
    // Update last seen anomaly info for display - clear when severity is Normal
    lastAnomalyType: severity === "Normal" ? undefined : anomalyType,
    lastAnomalySeverity: severity === "Normal" ? undefined : severity
  };
  _notify();
}

function _notify(): void {
  const snap = { ..._state, log: [..._state.log] };
  for (const fn of _listeners) fn(snap);
}

function fmtTs(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
