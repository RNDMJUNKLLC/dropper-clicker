import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/context/GameContext";
import type { CloudSyncStatus } from "@/lib/cloudSync";

const STATUS_CONFIG: Record<
  CloudSyncStatus,
  { icon: string; label: string; color: string }
> = {
  idle: { icon: "☁️", label: "Cloud", color: Colors.textDim },
  syncing: { icon: "🔄", label: "Syncing...", color: Colors.accent },
  saved: { icon: "✅", label: "Saved", color: Colors.xp },
  error: { icon: "⚠️", label: "Retry", color: Colors.rebirth },
  offline: { icon: "📴", label: "Offline", color: Colors.textDim },
};

export default function CloudSyncIndicator() {
  const { isAuthenticated } = useAuth();
  const { cloudSyncStatus } = useGame();

  if (!isAuthenticated) return null;

  const config = STATUS_CONFIG[cloudSyncStatus];

  return (
    <View style={[styles.container, { borderColor: config.color + "44" }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  icon: {
    fontSize: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
});
