import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import CoinSprite, { CoinRarity, SpawnedCoin } from "@/components/CoinSprite";
import UpgradeCard from "@/components/UpgradeCard";
import { coinUpgradeCost, useGame } from "@/context/GameContext";
import { formatNumber } from "@/utils/format";

const COIN_SIZE = 58;
const SPAWN_AREA_PADDING = 20;

function rollRarity(): CoinRarity {
  const roll = Math.random();
  if (roll < 0.03) return "legendary";
  if (roll < 0.15) return "rare";
  if (roll < 0.40) return "uncommon";
  return "common";
}

const RARITY_VALUES: Record<CoinRarity, number> = {
  common: 1,
  uncommon: 5,
  rare: 25,
  legendary: 100,
};

export default function CoinsScreen() {
  const {
    state,
    collectCoin,
    buyCoinUpgrade,
    bonusesUnlocked,
    coinSpawnIntervalMs,
    coinSpawnCap,
    coinSpawnBulk,
  } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 20);
  const botPad = Math.max(insets.bottom, 20);

  const [coins, setCoins] = useState<SpawnedCoin[]>([]);
  const coinIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectedIdsRef = useRef<Set<string>>(new Set());

  const screenWidth = Dimensions.get("window").width;
  const spawnAreaHeight = 340;

  const spawnCoin = useCallback(() => {
    setCoins((prev) => {
      if (prev.length >= coinSpawnCap) return prev;
      const newCoins: SpawnedCoin[] = [];
      for (let i = 0; i < coinSpawnBulk; i++) {
        if (prev.length + newCoins.length >= coinSpawnCap) break;
        const rarity = rollRarity();
        newCoins.push({
          id: `coin-${++coinIdRef.current}`,
          rarity,
          value: RARITY_VALUES[rarity],
          x: SPAWN_AREA_PADDING + Math.random() * (screenWidth - COIN_SIZE - SPAWN_AREA_PADDING * 2),
          y: SPAWN_AREA_PADDING + Math.random() * (spawnAreaHeight - COIN_SIZE - SPAWN_AREA_PADDING * 2),
        });
      }
      return [...prev, ...newCoins];
    });
  }, [coinSpawnCap, coinSpawnBulk, screenWidth]);

  useEffect(() => {
    if (!bonusesUnlocked) return;

    const scheduleSpawn = () => {
      const jitter = (Math.random() - 0.5) * coinSpawnIntervalMs * 0.4;
      spawnTimerRef.current = setTimeout(() => {
        spawnCoin();
        scheduleSpawn();
      }, coinSpawnIntervalMs + jitter);
    };

    scheduleSpawn();

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [bonusesUnlocked, coinSpawnIntervalMs, spawnCoin]);

  const handleCollect = useCallback(
    (coin: SpawnedCoin) => {
      if (collectedIdsRef.current.has(coin.id)) return;
      collectedIdsRef.current.add(coin.id);

      collectCoin(coin.value);

      setTimeout(() => {
        setCoins((prev) => prev.filter((c) => c.id !== coin.id));
        collectedIdsRef.current.delete(coin.id);
      }, 400);
    },
    [collectCoin]
  );

  const coinUpgradeList = [
    {
      id: "moreCash" as const,
      title: "More Cash",
      description: `2x points per drop\nCurrent: x${Math.pow(2, state.coinUpgrades.moreCash.buys)}`,
      color: Colors.accent,
    },
    {
      id: "moreXP" as const,
      title: "More XP",
      description: `2x XP per drop\nCurrent: x${Math.pow(2, state.coinUpgrades.moreXP.buys)}`,
      color: Colors.xp,
    },
    {
      id: "fasterSpawn" as const,
      title: "Faster Spawn",
      description: `-0.2s coin interval\nCurrent: ${(coinSpawnIntervalMs / 1000).toFixed(1)}s`,
      color: Colors.coinGold,
    },
  ];

  if (!bonusesUnlocked) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>BONUSES</Text>
          <Text style={styles.lockedText}>
            Reach level 8 to unlock the Bonuses tab
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>BONUSES</Text>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceValue}>{formatNumber(state.coins)}</Text>
            <Text style={styles.balanceLabel}> coins</Text>
          </View>
        </View>

        <View style={[styles.spawnArea, { height: spawnAreaHeight }]}>
          <View style={styles.spawnAreaBorder}>
            {coins.length === 0 && (
              <Text style={styles.hintText}>Coins will appear here...</Text>
            )}
            {coins.map((coin) => (
              <CoinSprite
                key={coin.id}
                coin={coin}
                onCollect={handleCollect}
              />
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(state.coins)}</Text>
            <Text style={styles.statLabel}>COINS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(state.lifetimeCoins)}</Text>
            <Text style={styles.statLabel}>LIFETIME</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(coinSpawnIntervalMs / 1000).toFixed(1)}s</Text>
            <Text style={styles.statLabel}>SPAWN RATE</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coinSpawnCap}</Text>
            <Text style={styles.statLabel}>CAP</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COIN UPGRADES</Text>
          <View style={styles.upgradesGrid}>
            {coinUpgradeList.map((upg) => {
              const upgrade = state.coinUpgrades[upg.id];
              const cost = coinUpgradeCost(upgrade);
              return (
                <UpgradeCard
                  key={upg.id}
                  title={upg.title}
                  description={upg.description}
                  cost={cost}
                  costLabel="coins"
                  buys={upgrade.buys}
                  maxBuys={upgrade.maxBuys}
                  canAfford={state.coins >= cost}
                  isMaxed={upgrade.buys >= upgrade.maxBuys}
                  onBuy={() => buyCoinUpgrade(upg.id)}
                  color={upg.color}
                />
              );
            })}
          </View>
        </View>
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
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.coinGold,
    letterSpacing: 4,
    fontFamily: "Inter_700Bold",
  },
  balanceBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: Colors.coinGold + "22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.coinGold,
    fontFamily: "Inter_700Bold",
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.coinGold + "AA",
    fontFamily: "Inter_500Medium",
  },
  spawnArea: {
    borderRadius: 16,
    overflow: "hidden",
  },
  spawnAreaBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.bgBorder,
    borderRadius: 16,
    backgroundColor: Colors.bgCard,
    borderStyle: "dashed",
  },
  hintText: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    color: Colors.textDim,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    transform: [{ translateY: -8 }],
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.coinGold,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.coinGold,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  upgradesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  lockedIcon: {
    fontSize: 48,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.coinGold,
    letterSpacing: 4,
    fontFamily: "Inter_700Bold",
  },
  lockedText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
