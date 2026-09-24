import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { TERM } from "@/components/terminal";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
}

export function StatusFooter({ relayEngaged, monitoring }: { relayEngaged: boolean; monitoring: boolean }) {
  const clock = useClock();
  const color = relayEngaged ? TERM.red : monitoring ? TERM.green : TERM.amber;
  const text = relayEngaged ? "E-STOP" : monitoring ? "STREAM_ACTIVE" : "STREAM_PAUSED";
  return (
    <View style={{ borderTopWidth: 1, borderColor: TERM.greenDim, backgroundColor: TERM.bg }} className="flex-row flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <Text className="font-mono text-[9px] tracking-widest" style={{ color: TERM.dimGray }}>STATUS: <Text style={{ color, fontWeight: "bold" }}>{text}</Text></Text>
      <Text className="font-mono text-[9px] tracking-widest" style={{ color: TERM.dimGray }}>FREQ RESP: 40Hz - 15kHz</Text>
      <Text className="font-mono text-[9px] tracking-widest" style={{ color: TERM.dimGray }}>PROTOCOL: MQTT / TCP 1883</Text>
      <Text className="font-mono text-[9px] tracking-widest" style={{ color: relayEngaged ? TERM.red : TERM.dimGray }}>OPTICAL RELAY INTERLOCK {relayEngaged ? "ENGAGED" : "ACTIVE"}</Text>
      <Text className="font-mono text-[9px] tracking-widest" style={{ color: TERM.dimGray }}>TERMINAL REV 1.04-SIH</Text>
      <Text className="ml-auto font-mono text-[9px] tracking-widest" style={{ color: TERM.green }}>SYSTEM_TIME: {clock}</Text>
    </View>
  );
}
