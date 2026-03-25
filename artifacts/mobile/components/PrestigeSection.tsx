import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import {
  calcPrestigePoints,
  getEffectivePrestigeMaxBuys,
  prestigeUpgradeCost,
  useGame,
} from "@/context/GameContext";
import { formatNumber, formatPP } from "@/utils/format";
import UpgradeCard from "./UpgradeCard";

function PulseButton({
  onPress,
  label,
  sublabel,
  color,
  active,
}: {
  onPress: () => void;
  label: string;
  sublabel: string;
  color: string;
  active: boolean;
}) {
  const glow = useSharedValue(0.5);

  React.useEffect(() => {
    if (active) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.5, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      glow.value = 0.3;
    }
  }, [active]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.pulseContainer}>
      {active && (
        <Animated.View
          style={[styles.pulseRing, { borderColor: color }, glowStyle]}
        />
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={!active}
        style={[
          styles.actionButton,
          { borderColor: active ? color : Colors.bgBorder },
        ]}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.actionLabel,
            { color: active ? color : Colors.textDim },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.actionSub,
            { color: active ? color + "AA" : Colors.textDim },
          ]}
        >
          {sublabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PrestigeSection() {
  const { state, prestige, buyPrestigeUpgrade, canPrestige } = useGame();

  const rawPP = calcPrestigePoints(state.points);
  const rebirthPPMult =
    state.rebirthTier >= 1 ? Math.pow(2, state.rebirthCount) : 1;
  const ppGainMult =
    Math.pow(2, state.prestigeUpgrades.morePP.buys) * rebirthPPMult;
  const totalPPGain = rawPP * ppGainMult;

  const tier2Active = state.rebirthTier >= 2;

  const handlePrestige = () => {
    if (!canPrestige) return;
    const resetNote = tier2Active
      ? "Only points will be removed."
      : "Reset all base progress and gain";
    Alert.alert(
      "Prestige",
      tier2Active
        ? `Remove all points and gain ${formatPP(totalPPGain)} Prestige Points? Upgrades are kept.`
        : `Reset all base progress and gain ${formatPP(totalPPGain)} Prestige Points?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Prestige",
          style: "destructive",
          onPress: () => {
            prestige();
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
          },
        },
      ]
    );
  };

  const upgrades = [
    {
      id: "morePoints" as const,
      title: "More Drops",
      description: `2x points per drop\nCurrent: x${Math.pow(2, state.prestigeUpgrades.morePoints.buys)}`,
      color: Colors.accent,
    },
    {
      id: "moreXP" as const,
      title: "More XP",
      description: `2x XP per drop\nCurrent: x${Math.pow(2, state.prestigeUpgrades.moreXP.buys)}`,
      color: Colors.xp,
    },
    {
      id: "morePP" as const,
      title: "More PP",
      description: `2x PP gain on prestige\nCurrent: x${Math.pow(2, state.prestigeUpgrades.morePP.buys)}`,
      color: Colors.prestige,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>PRESTIGE</Text>
          <View style={styles.ppBadge}>
            <Text style={styles.ppValue}>{formatPP(state.prestigePoints)}</Text>
            <Text style={styles.ppLabel}> PP</Text>
          </View>
        </View>
        {ppGainMult > 1 && (
          <Text style={styles.effectiveNote}>
            PP gain: x{ppGainMult.toFixed(0)} (from upgrades/rebirth)
          </Text>
        )}
      </View>

      <PulseButton
        onPress={handlePrestige}
        label="PRESTIGE"
        sublabel={
          canPrestige
            ? `+${formatPP(totalPPGain)} PP`
            : `Need ${formatNumber(1000)} current points`
        }
        color={Colors.prestige}
        active={canPrestige}
      />

      <View style={styles.upgradesGrid}>
        {upgrades.map((upg) => {
          const upgrade = state.prestigeUpgrades[upg.id];
          const cost = prestigeUpgradeCost(upgrade);
          const effectiveMax = getEffectivePrestigeMaxBuys(
            upgrade.maxBuys,
            tier2Active
          );
          const canAfford = state.prestigePoints >= cost;
          return (
            <UpgradeCard
              key={upg.id}
              title={upg.title}
              description={upg.description}
              cost={cost}
              costLabel="PP"
              buys={upgrade.buys}
              maxBuys={effectiveMax}
              canAfford={canAfford}
              isMaxed={upgrade.buys >= effectiveMax}
              onBuy={() => buyPrestigeUpgrade(upg.id)}
              color={upg.color}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.prestige,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  ppBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: Colors.prestige + "22",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ppValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.prestige,
    fontFamily: "Inter_700Bold",
  },
  ppLabel: {
    fontSize: 10,
    color: Colors.prestige + "AA",
    fontFamily: "Inter_600SemiBold",
  },
  effectiveNote: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  pulseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: "108%",
    height: 70,
    borderRadius: 16,
    borderWidth: 2,
  },
  actionButton: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  actionSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  upgradesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
