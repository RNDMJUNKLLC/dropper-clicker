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
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/utils/format";

const REBIRTH_THRESHOLDS = [0, 1e15, 2.5e16, 5e17, 2.5e19, 1e21];

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const logProgress =
    value <= 0
      ? 0
      : Math.min(Math.log10(value + 1) / Math.log10(max + 1), 1);
  return (
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          { width: `${logProgress * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function RebirthButton({
  label,
  threshold,
  currentPoints,
  perks,
  color,
  active,
  onPress,
  unlocked,
  requiresText,
}: {
  label: string;
  threshold: number;
  currentPoints: number;
  perks: string[];
  color: string;
  active: boolean;
  onPress: () => void;
  unlocked: boolean;
  requiresText?: string;
}) {
  const glow = useSharedValue(0.4);

  React.useEffect(() => {
    if (active) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0.4, { duration: 700 })
        ),
        -1,
        false
      );
    } else {
      glow.value = 0.3;
    }
  }, [active]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.rebirthWrapper}>
      {active && (
        <Animated.View
          style={[styles.rebirthRing, { borderColor: color }, ringStyle]}
        />
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={!active}
        style={[
          styles.rebirthButton,
          { borderColor: active ? color : Colors.bgBorder },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.rebirthHeader}>
          <Text
            style={[
              styles.rebirthLabel,
              { color: active ? color : Colors.textDim },
            ]}
          >
            {label}
          </Text>
          {unlocked && (
            <View style={[styles.activeChip, { backgroundColor: color + "33" }]}>
              <Text style={[styles.activeChipText, { color }]}>ACTIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.progressSection}>
          <ProgressBar value={currentPoints} max={threshold} color={color} />
          <Text
            style={[
              styles.progressText,
              { color: active ? color + "CC" : Colors.textDim },
            ]}
          >
            {formatNumber(currentPoints)} / {formatNumber(threshold)} pts
            {requiresText ? ` + ${requiresText}` : ""}
          </Text>
        </View>

        <View style={styles.perksContainer}>
          {perks.map((perk, i) => {
            const isComingSoon = perk.startsWith("Coming Soon:");
            return (
              <View key={i} style={styles.perkRow}>
                <View
                  style={[
                    styles.perkDot,
                    {
                      backgroundColor: isComingSoon
                        ? Colors.textDim
                        : unlocked
                          ? color
                          : Colors.textDim,
                    },
                  ]}
                />
                {isComingSoon ? (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>{perk}</Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.perkText,
                      { color: unlocked ? Colors.textPrimary : Colors.textDim },
                    ]}
                  >
                    {perk}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function RebirthSection() {
  const { state, rebirth, canRebirth1, canRebirth2, canRebirth3, canRebirth4, canRebirth5 } = useGame();

  const handleRebirth = (which: 1 | 2 | 3 | 4 | 5) => {
    const activeMap = { 1: canRebirth1, 2: canRebirth2, 3: canRebirth3, 4: canRebirth4, 5: canRebirth5 };
    if (!activeMap[which]) return;

    Alert.alert(
      `Rebirth ${which}`,
      `This resets points, XP, level, upgrades, prestige, and PP. Coins, tree, and reading are kept. Your new perks are permanently unlocked.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rebirth",
          style: "destructive",
          onPress: () => {
            rebirth(which);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>REBIRTH</Text>
        {state.rebirthCount > 0 && (
          <View style={styles.countChip}>
            <Text style={styles.countText}>{state.rebirthCount}x</Text>
          </View>
        )}
        {state.rebirthTier > 0 && (
          <View style={[styles.countChip, { backgroundColor: Colors.rebirthPink + "33" }]}>
            <Text style={[styles.countText, { color: Colors.rebirthPink }]}>Tier {state.rebirthTier}</Text>
          </View>
        )}
      </View>

      <RebirthButton
        label="REBIRTH I"
        threshold={REBIRTH_THRESHOLDS[1]}
        currentPoints={state.points}
        perks={[
          "Auto-click every 0.5s",
          "2x all stats per rebirth",
          "x3 coin value",
        ]}
        color={Colors.rebirth}
        active={canRebirth1}
        unlocked={state.rebirthTier >= 1}
        onPress={() => handleRebirth(1)}
      />

      <RebirthButton
        label="REBIRTH II"
        threshold={REBIRTH_THRESHOLDS[2]}
        currentPoints={state.points}
        perks={[
          "+25 max buys (drop & prestige upgrades)",
          "x3 reading points",
          "Unlock tree rows 9-10",
          "Prestige keeps drop upgrades",
        ]}
        color={Colors.rebirthPink}
        active={canRebirth2}
        unlocked={state.rebirthTier >= 2}
        onPress={() => handleRebirth(2)}
        requiresText="Tier I"
      />

      <RebirthButton
        label="REBIRTH III"
        threshold={REBIRTH_THRESHOLDS[3]}
        currentPoints={state.points}
        perks={[
          "Auto-buy drop & prestige upgrades (free)",
          "+10% PP per second",
        ]}
        color={Colors.rebirthBlue}
        active={canRebirth3}
        unlocked={state.rebirthTier >= 3}
        onPress={() => handleRebirth(3)}
        requiresText="Tier II"
      />

      <RebirthButton
        label="REBIRTH IV"
        threshold={REBIRTH_THRESHOLDS[4]}
        currentPoints={state.points}
        perks={[
          "Auto-invest reading points evenly",
          "Auto-buy books (free)",
          "Coming Soon: Daily Challenges",
        ]}
        color={Colors.rebirthEmerald}
        active={canRebirth4}
        unlocked={state.rebirthTier >= 4}
        onPress={() => handleRebirth(4)}
        requiresText="Tier III"
      />

      <RebirthButton
        label="REBIRTH V"
        threshold={REBIRTH_THRESHOLDS[5]}
        currentPoints={state.points}
        perks={[
          "Auto-buy coin upgrades (free)",
          "Coming Soon: Gems & Diamonds",
        ]}
        color={Colors.rebirthAmber}
        active={canRebirth5}
        unlocked={state.rebirthTier >= 5}
        onPress={() => handleRebirth(5)}
        requiresText="Tier IV"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.rebirth,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  countChip: {
    backgroundColor: Colors.rebirth + "33",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.rebirth,
    fontFamily: "Inter_700Bold",
  },
  rebirthWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  rebirthRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  rebirthButton: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: Colors.bgCard,
    gap: 8,
  },
  rebirthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rebirthLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  activeChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeChipText: {
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  progressSection: {
    gap: 4,
  },
  progressBar: {
    height: 5,
    backgroundColor: Colors.bgBorder,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  perksContainer: {
    gap: 5,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  perkDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  perkText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  comingSoonBadge: {
    backgroundColor: Colors.bgBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 10,
    color: Colors.textDim,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic" as const,
  },
});
