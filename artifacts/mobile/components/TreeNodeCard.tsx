import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import type { TreeNode } from "@/constants/upgradeTree";
import { formatNumber } from "@/utils/format";

const CURRENCY_LABELS: Record<string, string> = {
  points: "pts",
  prestigePoints: "PP",
  coins: "coins",
  readingPoints: "RP",
};

const CURRENCY_COLORS: Record<string, string> = {
  points: Colors.accent,
  prestigePoints: Colors.prestige,
  coins: Colors.coinGold,
  readingPoints: Colors.rebirthBlue,
};

interface TreeNodeCardProps {
  node: TreeNode;
  purchased: boolean;
  available: boolean;
  canAfford: boolean;
  lockedReason: string | null;
  onBuy: () => void;
}

export default function TreeNodeCard({
  node,
  purchased,
  available,
  canAfford,
  lockedReason,
  onBuy,
}: TreeNodeCardProps) {
  const color = CURRENCY_COLORS[node.currency] ?? Colors.accent;
  const label = CURRENCY_LABELS[node.currency] ?? "";
  const locked = !purchased && !available;

  const handlePress = () => {
    if (purchased || locked || !canAfford) return;
    onBuy();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={purchased || locked || !canAfford}
      activeOpacity={0.75}
      style={[
        styles.card,
        purchased && styles.purchasedCard,
        !purchased && available && canAfford && { borderColor: color + "88" },
        locked && styles.lockedCard,
      ]}
    >
      {purchased && (
        <View style={[styles.checkBadge, { backgroundColor: color + "22" }]}>
          <Text style={[styles.checkMark, { color }]}>✓</Text>
        </View>
      )}

      <Text
        style={[
          styles.name,
          { color: purchased ? color : locked ? Colors.textDim : Colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {node.name}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {node.description}
      </Text>

      {lockedReason ? (
        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>{lockedReason}</Text>
        </View>
      ) : purchased ? (
        <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
          <Text style={[styles.statusText, { color }]}>OWNED</Text>
        </View>
      ) : (
        <View
          style={[
            styles.costBadge,
            canAfford
              ? { backgroundColor: color + "22" }
              : { backgroundColor: Colors.bgBorder },
          ]}
        >
          <Text
            style={[
              styles.costText,
              canAfford ? { color } : { color: Colors.textDim },
            ]}
          >
            {formatNumber(node.cost)} {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 6,
    flex: 1,
    minWidth: 90,
  },
  purchasedCard: {
    borderColor: Colors.bgBorder,
    opacity: 0.85,
  },
  lockedCard: {
    opacity: 0.4,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    paddingRight: 24,
  },
  description: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
  },
  lockBadge: {
    backgroundColor: Colors.bgBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  lockText: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  costBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  costText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
