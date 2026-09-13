import { ReactNode } from "react";
import { Text, View } from "react-native";

export const TERM = {
  bg: "#050505",
  panel: "#0A0C0A",
  panelRaised: "#0E140F",
  border: "#1E3323",
  borderDim: "#143021",
  green: "#33FF5E",
  greenMuted: "#4FA871",
  greenDim: "#2A5A3A",
  text: "#D9FFE6",
  textDim: "#9BCDAB",
  amber: "#FFC857",
  red: "#FF4D4D",
  cyan: "#5CE1FF",
} as const;

export type TermTone = "green" | "amber" | "red" | "cyan" | "dim" | "text";

export const toneColor: Record<TermTone, string> = {
  green: TERM.green,
  amber: TERM.amber,
  red: TERM.red,
  cyan: TERM.cyan,
  dim: TERM.greenMuted,
  text: TERM.text,
};

/** A sharp-bordered terminal panel with an optional title bar (e.g. `[ LIVE MONITOR ]`). */
export function TermPanel({
  title,
  tone = "green",
  children,
  padding = "p-3",
}: {
  title?: string;
  tone?: TermTone;
  children: ReactNode;
  padding?: string;
}) {
  return (
    <View className="rounded-none border" style={{ borderColor: toneColor[tone], backgroundColor: TERM.panel }}>
      {title ? (
        <View style={{ borderBottomWidth: 1, borderColor: toneColor[tone], backgroundColor: TERM.panelRaised, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: toneColor[tone] }}>
            [ {title} ]
          </Text>
        </View>
      ) : null}
      <View className={padding}>{children}</View>
    </View>
  );
}

/** A single line of shell output with an optional `$` prompt prefix. */
export function TermLine({
  prompt = false,
  tone = "dim",
  children,
  spacing = false,
}: {
  prompt?: boolean;
  tone?: TermTone;
  children: ReactNode;
  spacing?: boolean;
}) {
  return (
    <View className="flex-row" style={spacing ? { marginTop: 6 } : undefined}>
      {prompt ? (
        <>
          <Text className="font-mono text-sm" style={{ color: TERM.green }}>$ </Text>
          <Text className="font-mono text-sm" style={{ color: TERM.text, flexShrink: 1 }}>{children}</Text>
        </>
      ) : (
        <Text className="font-mono text-xs leading-5" style={{ color: toneColor[tone], flexShrink: 1 }}>{children}</Text>
      )}
    </View>
  );
}

/** A right-aligned stat line, e.g. `conf=0.998  ok`. */
export function TermStat({ label, value, tone = "text" }: { label: string; value: string; tone?: TermTone }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-mono text-xs" style={{ color: TERM.greenMuted }}>{label}</Text>
      <Text className="font-mono text-xs font-bold" style={{ color: toneColor[tone] }}>{value}</Text>
    </View>
  );
}

/** Block gauge that reads like an ASCII meter (e.g. `[####----] 96%`). */
export function TermGauge({ pct, tone = "green", width = 18 }: { pct: number; tone?: TermTone; width?: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const filled = Math.round((clamped / 100) * width);
  return (
    <View className="flex-row items-center gap-2">
      <Text className="font-mono text-xs" style={{ color: toneColor[tone] }}>
        [{"#".repeat(filled)}{"-".repeat(width - filled)}]
      </Text>
      <Text className="font-mono text-xs font-bold" style={{ color: toneColor[tone] }}>{clamped}%</Text>
    </View>
  );
}