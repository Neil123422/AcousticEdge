import { Pressable, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import type { BottomTabBarButtonProps } from "expo-router/build/react-navigation/bottom-tabs/types";

type PressableProps = {
  style?: unknown;
  onPress?: (ev: GestureResponderEvent) => void;
  onPressIn?: (ev: GestureResponderEvent) => void;
  children?: React.ReactNode;
};

export function HapticTab(props: BottomTabBarButtonProps) {
  const { style, onPress, onPressIn, children } = props as PressableProps;
  return (
    <Pressable
      {...({ style, onPress, children } as Record<string, unknown>) as any}
      onPressIn={(ev: GestureResponderEvent) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    >
      {children}
    </Pressable>
  );
}