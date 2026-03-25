import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { formatNumber, formatPP, formatTime } from "@/utils/format";

interface StatsPanelProps {
  points: number;
  runPoints: number;
  lifetimePoints: number;
  prestigePoints: number;
  rebirthCount: number;
  dropAmount: number;
  clickCooldownMs: number;
  levelPointsMult: number;
  levelXPMult: number;
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        <Text style={{ color: color ?? Colors.textPrimary }}>{value}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StatsPanel({
  points,
  runPoints,
  lifetimePoints,
  prestigePoints,
  rebirthCount,
  dropAmount,
  clickCooldownMs,
  levelPointsMult,
  levelXPMult,
}: StatsPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Stat label="Points" value={formatNumber(points)} color={Colors.accent} />
        <View style={styles.divider} />
        <Stat label="Run Total" value={formatNumber(runPoints)} />
        <View style={styles.divider} />
        <Stat label="Per Drop" value={formatNumber(dropAmount)} color={Colors.accent} />
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Stat label="Lifetime" value={formatNumber(lifetimePoints)} color={Colors.xp} />
        <View style={styles.divider} />
        <Stat label="PP" value={formatPP(prestigePoints)} color={Colors.prestige} />
        <View style={styles.divider} />
        <Stat label="Rebirths" value={String(rebirthCount)} color={Colors.rebirth} />
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Stat label="Cooldown" value={formatTime(clickCooldownMs)} color={Colors.accentDim} />
        <View style={styles.divider} />
        <Stat label="Pts Mult" value={`x${levelPointsMult.toFixed(1)}`} color={Colors.xp} />
        <View style={styles.divider} />
        <Stat label="XP Mult" value={`x${levelXPMult.toFixed(1)}`} color={Colors.xp} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 6,
  },
  stat: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.bgBorder,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.bgBorder,
    marginHorizontal: 16,
  },
});
