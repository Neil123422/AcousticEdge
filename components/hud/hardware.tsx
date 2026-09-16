import { TERM } from "@/components/terminal";
import { Text, View } from "react-native";

type HardwareNode = {
  name: string;
  pill: string;
  desc: string;
  tone: string;
};

const NODES: HardwareNode[] = [
  {
    name: "> ESP32-S3 (Edge Node)",
    pill: "Inference",
    desc: "Audio sampling & on-chip TinyML vector acceleration. Publishes lightweight health packets over MQTT.",
    tone: TERM.green,
  },
  {
    name: "> INMP441 (I2S Mic)",
    pill: "Acoustics",
    desc: "Omnidirectional digital acoustic transducer mounted on belt framework to capture micro-crack transients.",
    tone: TERM.green,
  },
  {
    name: "> Raspberry Pi (Gateway)",
    pill: "Host/Broker",
    desc: "Central control hub hosting Mosquitto MQTT broker, persistent event database, and telemetry web dashboard.",
    tone: TERM.amber,
  },
  {
    name: "> Relay Module",
    pill: "E-Stop",
    desc: "Optocoupled relay directly interlocked with motor VFD for millisecond-grade automatic belt cutoff on critical fault.",
    tone: TERM.amber,
  },
];

/** Column 2 — Hardware Architecture Overview (compact). */
export function HardwareArchitecture() {
  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>// HARDWARE ARCHITECTURE</Text>
        <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.dimGray }}>SYS_SPEC</Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }} className="gap-y-1.5 px-2 py-2">
        {NODES.map((node) => (
          <View key={node.name}>
            <View className="flex-row items-center gap-1.5">
              <Text className="font-mono text-[9px] font-bold" style={{ color: TERM.text, flexShrink: 1 }}>{node.name}</Text>
              <Text
                className="font-mono text-[7px] font-bold tracking-widest"
                style={{ color: node.tone, borderWidth: 1, borderColor: node.tone, paddingHorizontal: 3, paddingVertical: 0 }}
              >
                [{node.pill}]
              </Text>
            </View>
            <Text className="mt-0.5 font-mono text-[9px] leading-3" style={{ color: TERM.textDim }}>{node.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}