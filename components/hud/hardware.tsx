import { TERM } from "@/components/terminal";
import { Text, View } from "react-native";

type Node = { name: string; pill: string; desc: string; accent: string };

const NODES: Node[] = [
  { name: "> INMP441 (MEMS Mic)", pill: "Acoustics", desc: "Omnidirectional I2S digital acoustic transducer. 16.0 kHz / 16-bit capture.", accent: "#00D0FF" },
  { name: "> ESP32-S3 (Edge Node)", pill: "Inference", desc: "Xtensa LX7 Dual-Core. Edge Impulse TinyML on-chip inference.", accent: TERM.green },
  { name: "> TinyML CNN", pill: "Model", desc: "Convolutional neural net trained on conveyor fault signatures.", accent: TERM.amber },
  { name: "> Optical Relay", pill: "E-Stop", desc: "Optocoupled interlock with motor VFD for millisecond-grade cutoff.", accent: TERM.red },
];

export function HardwareArchitecture() {
  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-2 py-1.5">
        <Text className="font-mono text-xs font-bold tracking-[2px]" style={{ color: TERM.green }}>{"// HARDWARE ARCHITECTURE"}</Text>
        <Text className="font-mono text-[8px] font-bold tracking-widest" style={{ color: TERM.dimGray }}>SYS_SPEC</Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: TERM.border }} className="gap-2 px-2 py-2">
        {NODES.map((n) => (
          <View key={n.name} style={{ borderWidth: 1, borderColor: n.accent, padding: 4, borderRadius: 0 }}>
            <View className="flex-row items-center gap-1.5">
              <Text className="font-mono text-[9px] font-bold" style={{ color: n.accent }}>{n.name}</Text>
              <Text className="font-mono text-[7px] font-bold tracking-widest" style={{ color: n.accent, borderWidth: 1, borderColor: n.accent, paddingHorizontal: 3, paddingVertical: 0 }}>
                [{n.pill}]
              </Text>
            </View>
            <Text className="mt-0.5 font-mono text-[9px] leading-3" style={{ color: TERM.textDim }}>{n.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
