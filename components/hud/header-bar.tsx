import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { TERM } from "@/components/terminal";

/** Green glowing power LED — blinks every 1200ms when power=true. */
function PowerLed({ power }: { power: boolean }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!power) {
      const timeout = setTimeout(() => setOn(false), 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setOn(true), 0);
    const id = setInterval(() => setOn((s) => !s), 1200);
    return () => {
      clearTimeout(timeout);
      clearInterval(id);
    };
  }, [power]);

  if (!power) {
    return <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: TERM.dimGray }}>• PWR</Text>;
  }
  return (
    <Text className="font-mono text-xs font-bold tracking-widest" style={{ color: on ? "#00FF66" : TERM.greenDim, textShadowColor: "#00FF66", textShadowRadius: on ? 6 : 0 }}>
      • PWR
    </Text>
  );
}

/**
 * Top command strip: title + [ ACOUSTIC_EDGE ] badge + PWR LED,
 * then the CLI command bar with the START/STOP monitoring toggle.
 */
export function HeaderBar({
  monitoring,
  onToggle,
  disabled,
}: {
  monitoring: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: TERM.border, backgroundColor: TERM.bgAlt }}>
      <View className="flex-row items-center justify-between px-3 py-2">
        <View className="flex-1">
          <Text className="font-mono text-[11px] font-bold tracking-[1.5px]" style={{ color: TERM.text }}>
            CONVEYOR ACOUSTIC DIAGNOSTIC MONITOR
          </Text>
          <Text className="mt-1 font-mono text-[10px] tracking-wider" style={{ color: TERM.dimGray }}>
            [ ACOUSTIC_EDGE ]
          </Text>
        </View>
        <PowerLed power />
      </View>

      <View style={{ borderTopWidth: 1, borderColor: TERM.border }} className="flex-row items-center justify-between px-3 py-2">
        <Text className="font-mono text-[10px]" style={{ color: TERM.greenMuted, flexShrink: 1 }} numberOfLines={1}>
          cadm@edge-gateway:~$ ./run_diagnostic_stream.sh --sensor=INMP441
        </Text>
        <Pressable
          onPress={onToggle}
          disabled={disabled}
          style={({ pressed }) => [
            {
              borderWidth: 1,
              borderColor: monitoring ? TERM.red : TERM.green,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginLeft: 8,
              opacity: pressed ? 0.7 : disabled ? 0.4 : 1,
              backgroundColor: monitoring ? "transparent" : TERM.panelRaised,
            },
          ]}
        >
          <Text className="font-mono text-[10px] font-bold tracking-widest" style={{ color: monitoring ? TERM.red : TERM.green }}>
            [{monitoring ? " STOP MONITORING " : " START MONITORING "}]
          </Text>
        </Pressable>
      </View>
    </View>
  );
}