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
import { formatNumber } from "@/utils/format";

interface UpgradeCardProps {
  title: string;
  description: string;
  cost: number;
  costLabel?: string;
  buys: number;
  maxBuys: number;
  canAfford: boolean;
  isMaxed: boolean;
  onBuy: () => void;
  onBuyMax?: () => void;
  color?: string;
}

export default function UpgradeCard({
  title,
  description,
  cost,
  costLabel = "pts",
  buys,
  maxBuys,
  canAfford,
  isMaxed,
  onBuy,
  onBuyMax,
  color = Colors.accent,
}: UpgradeCardProps) {
  const handleBuy = () => {
    if (!canAfford || isMaxed) return;
    onBuy();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleBuyMax = () => {
    if (!canAfford || isMaxed || !onBuyMax) return;
    onBuyMax();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleBuy}
      style={[
        styles.card,
        canAfford && !isMaxed && { borderColor: color + "66" },
        isMaxed && styles.maxedCard,
      ]}
      activeOpacity={0.75}
      disabled={isMaxed}
      testID={`upgrade-${title}`}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: color + "22" }]}>
          <Text style={[styles.badgeText, { color }]}>
            {buys}/{maxBuys}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.footer}>
        {isMaxed ? (
          <Text style={styles.maxedLabel}>MAXED</Text>
        ) : (
          <View style={styles.footerRow}>
            <View style={[styles.costBadge, canAfford ? { backgroundColor: color + "22" } : styles.costBadgeDisabled]}>
              <Text style={[styles.costText, canAfford ? { color } : styles.costTextDisabled]}>
                {formatNumber(cost)} {costLabel}
              </Text>
            </View>
            {onBuyMax && canAfford && (
              <TouchableOpacity
                onPress={handleBuyMax}
                style={[styles.maxBtn, { backgroundColor: color + "22" }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.maxBtnText, { color }]}>MAX</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "30%",
    minWidth: 100,
  },
  maxedCard: {
    opacity: 0.5,
    borderColor: Colors.bgBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    flex: 1,
    marginRight: 6,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  costBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  costBadgeDisabled: {
    backgroundColor: Colors.bgBorder,
  },
  costText: {
    fontSize: 12,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  costTextDisabled: {
    color: Colors.textDim,
  },
  maxedLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textDim,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  maxBtn: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  maxBtnText: {
    fontSize: 10,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
