import { Stack } from "expo-router";

import { TERM } from "@/components/terminal";

/**
 * Single-screen HUD. All architecture + history content is folded
 * into the one interface per the redesign spec.
 */
export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: TERM.bg },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}