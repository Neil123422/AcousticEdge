import { ReactNode } from "react";
import { Text, View } from "react-native";

/** Retro-cyberpunk industrial terminal palette per HUD spec. */
export const TERM = {
  bg: "#050807",
  bgAlt: "#0a0f0d",
  panel: "#0a0f0d",
  panelRaised: "#132b22",
  border: "#1b3d32",
  borderDim: "#132b22",
  green: "#00FF66",
  greenMuted: "#22c55e",
  greenDim: "#1b3d32",
  text: "#D9FFE6",
  textDim: "#9BCDAB",
  amber: "#eab308",
  amberDim: "#92710e",
  red: "#ef4444",
  redDim: "#7f1d1d",
  cyan: "#5CE1FF",
  dimGray: "#4b6b61",
} as const;

export type TermTone = "green" | "amber" | "red" | "cyan" | "dim" | "text";

export const toneColor: Record<TermTone, string> = {
  green: TERM.green,
  amber: TERM.amber,
  red: TERM.red,
  cyan: TERM.cyan,
  dim: TERM.dimGray,
  text: TERM.text,
};

/** A sharp-bordered terminal panel with an optional title bar. */
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
          <Text className="font-mono text-sm" style={{ color: TERM.green }}>{">"} </Text>
          <Text className="font-mono text-sm" style={{ color: TERM.text, flexShrink: 1 }}>{children}</Text>
        </>
      ) : (
        <Text className="font-mono text-xs leading-5" style={{ color: toneColor[tone], flexShrink: 1 }}>{children}</Text>
      )}
    </View>
  );
}

/** A right-aligned stat line. */
export function TermStat({ label, value, tone = "text" }: { label: string; value: string; tone?: TermTone }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-mono text-xs" style={{ color: TERM.dimGray }}>{label}</Text>
      <Text className="font-mono text-xs font-bold" style={{ color: toneColor[tone] }}>{value}</Text>
    </View>
  );
}

/** Block gauge: [####----] 96% */
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

/** Percentage progress bar (visual, non-ASCII). */
export function PctBar({ pct, color, height = 6, className }: { pct: number; color: string; height?: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <View className={className} style={{ height, borderRadius: 0, backgroundColor: "#132b22", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${clamped}%`, backgroundColor: color }} />
    </View>
  );
}
