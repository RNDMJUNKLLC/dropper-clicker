import React, { useCallback, useRef } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import DropButton from "@/components/DropButton";
import PrestigeSection from "@/components/PrestigeSection";
import RebirthSection from "@/components/RebirthSection";
import StatsPanel from "@/components/StatsPanel";
import UpgradeCard from "@/components/UpgradeCard";
import XPBar from "@/components/XPBar";
import { dropUpgradeCost, useGame } from "@/context/GameContext";
import { formatNumber, formatTime } from "@/utils/format";

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const {
    state,
    drop,
    buyDropUpgrade,
    dropAmount,
    xpAmount,
    dropTimerMs,
    xpProgress,
    xpRequired,
    showUpgrades,
    canPrestige,
    canRebirth1,
    canRebirth2,
  } = useGame();

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 20);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20);

  const dropUpgrades = [
    {
      id: "dropAmount" as const,
      title: "Drop Power",
      description: `+1 point/drop\nCurrent: +${1 + state.dropUpgrades.dropAmount.buys}`,
      color: Colors.accent,
    },
    {
      id: "dropXP" as const,
      title: "XP Surge",
      description: `x1.5 XP/drop\nCurrent: x${Math.pow(1.5, state.dropUpgrades.dropXP.buys).toFixed(2)}`,
      color: Colors.xp,
    },
    {
      id: "dropTimer" as const,
      title: "Rapid Drop",
      description: `−0.5s/drop\nCurrent: ${formatTime(dropTimerMs)}`,
      color: Colors.accentDim,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.gameName}>DROPPER</Text>
          <Text style={styles.gameTagline}>incremental</Text>
        </View>

        <View style={styles.pointsHero}>
          <Text style={styles.pointsValue}>{formatNumber(state.points)}</Text>
          <Text style={styles.pointsLabel}>POINTS</Text>
        </View>

        <View style={styles.xpRow}>
          <XPBar
            xp={state.xp}
            xpRequired={xpRequired}
            level={state.level}
            progress={xpProgress}
          />
        </View>

        <View style={styles.dropCenter}>
          <DropButton onDrop={drop} dropAmount={dropAmount} />
          <View style={styles.dropMeta}>
            <Text style={styles.dropMetaText}>
              AUTO: {formatTime(dropTimerMs)} · +{formatNumber(dropAmount)} pts · +{formatNumber(xpAmount)} XP
            </Text>
          </View>
        </View>

        <StatsPanel
          points={state.points}
          allTimePoints={state.allTimePoints}
          prestigePoints={state.prestigePoints}
          rebirthCount={state.rebirthCount}
          dropAmount={dropAmount}
          dropTimerMs={dropTimerMs}
        />

        {showUpgrades && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UPGRADES</Text>
            <View style={styles.upgradesGrid}>
              {dropUpgrades.map((upg) => {
                const upgrade = state.dropUpgrades[upg.id];
                const cost = dropUpgradeCost(upgrade);
                return (
                  <UpgradeCard
                    key={upg.id}
                    title={upg.title}
                    description={upg.description}
                    cost={cost}
                    costLabel="pts"
                    buys={upgrade.buys}
                    maxBuys={upgrade.maxBuys}
                    canAfford={state.points >= cost}
                    isMaxed={upgrade.buys >= upgrade.maxBuys}
                    onBuy={() => buyDropUpgrade(upg.id)}
                    color={upg.color}
                  />
                );
              })}
            </View>
            {state.rebirthPerks.autoBuyUpgrades && (
              <View style={styles.perkChip}>
                <Text style={styles.perkChipText}>AUTO-BUY ACTIVE</Text>
              </View>
            )}
          </View>
        )}

        {canPrestige || state.prestigePoints > 0 || state.prestigeUpgrades.morePoints.buys > 0 ? (
          <View style={styles.section}>
            <PrestigeSection />
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.lockedHint}>
              <Text style={styles.lockedTitle}>PRESTIGE</Text>
              <Text style={styles.lockedText}>
                Unlock at {formatNumber(1_000_000)} all-time points
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((state.allTimePoints / 1_000_000) * 100, 100)}%`,
                      backgroundColor: Colors.prestige,
                    },
                  ]}
                />
              </View>
              <Text style={styles.lockedProgress}>
                {formatNumber(state.allTimePoints)} / {formatNumber(1_000_000)}
              </Text>
            </View>
          </View>
        )}

        {canRebirth1 || canRebirth2 || state.rebirthCount > 0 ? (
          <View style={styles.section}>
            <RebirthSection />
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.lockedHint}>
              <Text style={[styles.lockedTitle, { color: Colors.rebirth }]}>REBIRTH</Text>
              <Text style={styles.lockedText}>
                Rebirth I at {formatNumber(1e75)} all-time pts
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  header: {
    alignItems: "center",
    paddingTop: 4,
  },
  gameName: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.accent,
    letterSpacing: 8,
    fontFamily: "Inter_700Bold",
  },
  gameTagline: {
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 4,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  pointsHero: {
    alignItems: "center",
    paddingVertical: 8,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  pointsLabel: {
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 4,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
  },
  xpRow: {
    width: "100%",
  },
  dropCenter: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  dropMeta: {
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  dropMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.accent,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  upgradesGrid: {
    flexDirection: "row",
    gap: 8,
  },
  perkChip: {
    marginTop: 8,
    backgroundColor: Colors.rebirth + "22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.rebirth + "44",
  },
  perkChipText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.rebirth,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  lockedHint: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 6,
  },
  lockedTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.prestige,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  lockedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.bgBorder,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  lockedProgress: {
    fontSize: 11,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
  },
});
