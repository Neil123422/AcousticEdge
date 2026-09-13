import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AnalysisResult } from "@/lib/poc-analysis";

export type Inspection = AnalysisResult & {
  id: string;
  conveyorId: string;
  recordedAt: string;
  durationSeconds: number;
};

const STORAGE_KEY = "conveyor-acoustic-inspections-v1";

export async function getInspections(): Promise<Inspection[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Inspection[];
  } catch {
    return [];
  }
}

export async function saveInspection(inspection: Inspection): Promise<void> {
  const existing = await getInspections();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([inspection, ...existing].slice(0, 30)));
}

export async function clearInspections(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
