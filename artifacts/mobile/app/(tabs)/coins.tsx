import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
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

const BASE_SPAWN_INTERVAL = 3000;
const BASE_COIN_LIFETIME = 5000;
const MAX_COINS_ON_SCREEN = 8;
const COIN_SIZE = 58;
const SPAWN_AREA_PADDING = 20;

function rollRarity(luckyBuys: number): CoinRarity {
  const luckBonus = luckyBuys * 0.02;
  const roll = Math.random();
  if (roll < 0.03 + luckBonus) return "legendary";
  if (roll < 0.15 + luckBonus * 2) return "rare";
  if (roll < 0.40 + luckBonus * 1.5) return "uncommon";
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
    coinsUnlocked,
  } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 20);
  const botPad = Math.max(insets.bottom, 20);

  const [coins, setCoins] = useState<SpawnedCoin[]>([]);
  const coinIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const spawnAreaHeight = 340;

  const magnetBuys = state.coinUpgrades.coinMagnet.buys;
  const luckyBuys = state.coinUpgrades.luckyDrops.buys;
  const rushBuys = state.coinUpgrades.coinRush.buys;

  const coinLifetime = BASE_COIN_LIFETIME + magnetBuys * 2000;
  const spawnInterval = Math.max(800, BASE_SPAWN_INTERVAL - rushBuys * 200);

  const spawnCoin = useCallback(() => {
    setCoins((prev) => {
      if (prev.length >= MAX_COINS_ON_SCREEN) return prev;
      const rarity = rollRarity(luckyBuys);
      const newCoin: SpawnedCoin = {
        id: `coin-${++coinIdRef.current}`,
        rarity,
        value: RARITY_VALUES[rarity],
        x: SPAWN_AREA_PADDING + Math.random() * (screenWidth - COIN_SIZE - SPAWN_AREA_PADDING * 2),
        y: SPAWN_AREA_PADDING + Math.random() * (spawnAreaHeight - COIN_SIZE - SPAWN_AREA_PADDING * 2),
      };
      return [...prev, newCoin];
    });
  }, [luckyBuys, screenWidth]);

  useEffect(() => {
    if (!coinsUnlocked) return;

    const scheduleSpawn = () => {
      const jitter = (Math.random() - 0.5) * spawnInterval * 0.4;
      spawnTimerRef.current = setTimeout(() => {
        spawnCoin();
        scheduleSpawn();
      }, spawnInterval + jitter);
    };

    scheduleSpawn();

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [coinsUnlocked, spawnInterval, spawnCoin]);

  const handleCollect = useCallback(
    (coin: SpawnedCoin) => {
      collectCoin(coin.value);
      setTimeout(() => {
        setCoins((prev) => prev.filter((c) => c.id !== coin.id));
      }, 400);
    },
    [collectCoin]
  );

  const handleExpire = useCallback((id: string) => {
    setCoins((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const upgrades = [
    {
      id: "coinMagnet" as const,
      title: "Coin Magnet",
      description: `+2s coin lifetime\nCurrent: ${(coinLifetime / 1000).toFixed(1)}s`,
      color: Colors.coinBronze,
    },
    {
      id: "luckyDrops" as const,
      title: "Lucky Drops",
      description: `Better rarity odds\n+${(luckyBuys * 2)}% legendary`,
      color: Colors.coinGold,
    },
    {
      id: "coinRush" as const,
      title: "Coin Rush",
      description: `Faster spawns\nEvery ${(spawnInterval / 1000).toFixed(1)}s`,
      color: Colors.coinSilver,
    },
  ];

  if (!coinsUnlocked) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>COINS</Text>
          <Text style={styles.lockedText}>
            Complete Rebirth I to unlock the Coins mini-game
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
          <Text style={styles.title}>COINS</Text>
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
                lifetimeMs={coinLifetime}
                onCollect={handleCollect}
                onExpire={handleExpire}
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
            <Text style={styles.statValue}>{(spawnInterval / 1000).toFixed(1)}s</Text>
            <Text style={styles.statLabel}>SPAWN RATE</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COIN UPGRADES</Text>
          <View style={styles.upgradesGrid}>
            {upgrades.map((upg) => {
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
    gap: 8,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  lockedIcon: {
    fontSize: 48,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textDim,
    letterSpacing: 4,
    fontFamily: "Inter_700Bold",
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
