import { getCloudSave, upsertCloudSave } from "@workspace/api-client-react";
import type { GameState } from "@/context/GameContext";

export type CloudSyncStatus = "idle" | "syncing" | "saved" | "error" | "offline";

export type FetchResult =
  | { status: "found"; gameState: GameState; version: number; savedAt: string }
  | { status: "empty" }
  | { status: "error" };

export async function fetchCloudSave(): Promise<FetchResult> {
  try {
    const response = await getCloudSave();
    if (response.save) {
      return {
        status: "found",
        gameState: response.save.gameState as unknown as GameState,
        version: response.save.version,
        savedAt: response.save.savedAt as unknown as string,
      };
    }
    return { status: "empty" };
  } catch {
    return { status: "error" };
  }
}

export async function pushCloudSave(
  gameState: GameState
): Promise<{ version: number; savedAt: string } | null> {
  try {
    const response = await upsertCloudSave({ gameState: gameState as unknown as Record<string, unknown> });
    return {
      version: response.version,
      savedAt: response.savedAt as unknown as string,
    };
  } catch {
    return null;
  }
}
