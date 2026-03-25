import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import CoinSprite, { CoinRarity, SpawnedCoin } from "@/components/CoinSprite";
import UpgradeCard from "@/components/UpgradeCard";
import { coinUpgradeCost, COIN_FRENZY_COST, useGame } from "@/context/GameContext";
import { formatNumber } from "@/utils/format";

const BASE_SPAWN_INTERVAL = 3000;
const BASE_COIN_LIFETIME = 5000;
const MAX_COINS_ON_SCREEN = 8;
const COIN_SIZE = 58;
const SPAWN_AREA_PADDING = 20;

const COMBO_WINDOW_MS = 2500;
const MAX_COMBO = 12;
const COMBO_MULT_PER_LEVEL = 0.25;

const FRENZY_DURATION_MS = 30_000;
const FRENZY_COOLDOWN_MS = 120_000;

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

function ComboCounter({ combo }: { combo: number }) {
  const glow = useSharedValue(0.6);

  useEffect(() => {
    if (combo > 0) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.6, { duration: 400 })
        ),
        -1,
        false
      );
    } else {
      glow.value = 0;
    }
  }, [combo > 0]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  if (combo === 0) return null;

  const mult = 1 + combo * COMBO_MULT_PER_LEVEL;

  return (
    <Animated.View style={[styles.comboContainer, glowStyle]}>
      <Text style={styles.comboText}>x{mult.toFixed(2)}</Text>
      <Text style={styles.comboLabel}>COMBO</Text>
    </Animated.View>
  );
}

function FrenzyButton({
  unlocked,
  canBuy,
  onBuy,
  onActivate,
  frenzyActive,
  frenzyTimeLeft,
  cooldownTimeLeft,
}: {
  unlocked: boolean;
  canBuy: boolean;
  onBuy: () => void;
  onActivate: () => void;
  frenzyActive: boolean;
  frenzyTimeLeft: number;
  cooldownTimeLeft: number;
}) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    if (unlocked && !frenzyActive && cooldownTimeLeft <= 0) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.5, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      pulse.value = frenzyActive ? 1 : 0.3;
    }
  }, [unlocked, frenzyActive, cooldownTimeLeft <= 0]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  if (!unlocked) {
    return (
      <TouchableOpacity
        style={[styles.frenzyButton, !canBuy && styles.frenzyButtonDisabled]}
        onPress={() => {
          onBuy();
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }}
        disabled={!canBuy}
        activeOpacity={0.8}
      >
        <Text style={[styles.frenzyButtonLabel, !canBuy && styles.frenzyTextDim]}>
          UNLOCK COIN FRENZY
        </Text>
        <Text style={[styles.frenzyButtonSub, !canBuy && styles.frenzyTextDim]}>
          2x spawn rate for 30s · {formatNumber(COIN_FRENZY_COST)} coins
        </Text>
      </TouchableOpacity>
    );
  }

  const ready = !frenzyActive && cooldownTimeLeft <= 0;
  const onCooldown = !frenzyActive && cooldownTimeLeft > 0;

  return (
    <View style={styles.frenzyWrapper}>
      {ready && (
        <Animated.View
          style={[styles.frenzyGlow, pulseStyle]}
        />
      )}
      <TouchableOpacity
        style={[
          styles.frenzyButton,
          frenzyActive && styles.frenzyButtonActive,
          onCooldown && styles.frenzyButtonDisabled,
        ]}
        onPress={() => {
          if (ready) {
            onActivate();
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
          }
        }}
        disabled={!ready}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.frenzyButtonLabel,
          frenzyActive && styles.frenzyActiveText,
          onCooldown && styles.frenzyTextDim,
        ]}>
          {frenzyActive ? "FRENZY ACTIVE" : onCooldown ? "RECHARGING" : "COIN FRENZY"}
        </Text>
        <Text style={[
          styles.frenzyButtonSub,
          frenzyActive && styles.frenzyActiveText,
          onCooldown && styles.frenzyTextDim,
        ]}>
          {frenzyActive
            ? `${Math.ceil(frenzyTimeLeft / 1000)}s remaining`
            : onCooldown
              ? `Ready in ${Math.ceil(cooldownTimeLeft / 1000)}s`
              : "Tap to activate · 2x spawn rate"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CoinsScreen() {
  const {
    state,
    collectCoin,
    buyCoinUpgrade,
    buyCoinFrenzy,
    coinsUnlocked,
  } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 20);
  const botPad = Math.max(insets.bottom, 20);

  const [coins, setCoins] = useState<SpawnedCoin[]>([]);
  const coinIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCollectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [combo, setCombo] = useState(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  const [frenzyActive, setFrenzyActive] = useState(false);
  const [frenzyTimeLeft, setFrenzyTimeLeft] = useState(0);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const frenzyEndRef = useRef(0);
  const cooldownEndRef = useRef(0);
  const frenzyTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const spawnAreaHeight = 340;

  const magnetBuys = state.coinUpgrades.coinMagnet.buys;
  const luckyBuys = state.coinUpgrades.luckyDrops.buys;
  const rushBuys = state.coinUpgrades.coinRush.buys;
  const autoCollectorBuys = state.coinUpgrades.autoCollector.buys;

  const coinLifetime = BASE_COIN_LIFETIME + magnetBuys * 2000;
  const baseSpawnInterval = Math.max(800, BASE_SPAWN_INTERVAL - rushBuys * 200);
  const spawnInterval = frenzyActive ? Math.round(baseSpawnInterval / 2) : baseSpawnInterval;

  const autoCollectInterval = autoCollectorBuys > 0
    ? (4000 - (autoCollectorBuys - 1) * 500)
    : 0;

  const comboMult = 1 + combo * COMBO_MULT_PER_LEVEL;

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
    (coin: SpawnedCoin, isAuto?: boolean) => {
      const currentCombo = comboRef.current;
      const mult = 1 + currentCombo * COMBO_MULT_PER_LEVEL;
      const adjustedValue = Math.round(coin.value * mult);
      collectCoin(adjustedValue);

      if (!isAuto) {
        setCombo((prev) => {
          const next = Math.min(prev + 1, MAX_COMBO);
          comboRef.current = next;
          return next;
        });
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => {
          setCombo(0);
          comboRef.current = 0;
        }, COMBO_WINDOW_MS);
      }

      setTimeout(() => {
        setCoins((prev) => prev.filter((c) => c.id !== coin.id));
      }, 400);
    },
    [collectCoin]
  );

  const comboRef = useRef(0);

  const handleExpire = useCallback((id: string) => {
    setCoins((prev) => prev.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (autoCollectTimerRef.current) clearInterval(autoCollectTimerRef.current);
    if (!coinsUnlocked || autoCollectorBuys <= 0) return;

    autoCollectTimerRef.current = setInterval(() => {
      const currentCoins = coinsRef.current;
      if (currentCoins.length > 0) {
        const oldest = currentCoins[0];
        handleCollect(oldest, true);
      }
    }, autoCollectInterval);

    return () => {
      if (autoCollectTimerRef.current) clearInterval(autoCollectTimerRef.current);
    };
  }, [coinsUnlocked, autoCollectorBuys, autoCollectInterval, handleCollect]);

  const activateFrenzy = useCallback(() => {
    if (!state.coinFrenzyUnlocked || frenzyActive) return;
    if (cooldownEndRef.current > Date.now()) return;

    setFrenzyActive(true);
    const endTime = Date.now() + FRENZY_DURATION_MS;
    frenzyEndRef.current = endTime;
    setFrenzyTimeLeft(FRENZY_DURATION_MS);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [state.coinFrenzyUnlocked, frenzyActive]);

  useEffect(() => {
    if (frenzyTickRef.current) clearInterval(frenzyTickRef.current);
    if (!frenzyActive && cooldownEndRef.current <= Date.now()) return;

    frenzyTickRef.current = setInterval(() => {
      const now = Date.now();
      if (frenzyActive) {
        const remaining = frenzyEndRef.current - now;
        if (remaining <= 0) {
          setFrenzyActive(false);
          setFrenzyTimeLeft(0);
          cooldownEndRef.current = now + FRENZY_COOLDOWN_MS;
          setCooldownTimeLeft(FRENZY_COOLDOWN_MS);
        } else {
          setFrenzyTimeLeft(remaining);
        }
      } else if (cooldownEndRef.current > now) {
        setCooldownTimeLeft(cooldownEndRef.current - now);
      } else {
        setCooldownTimeLeft(0);
        if (frenzyTickRef.current) clearInterval(frenzyTickRef.current);
      }
    }, 200);

    return () => {
      if (frenzyTickRef.current) clearInterval(frenzyTickRef.current);
    };
  }, [frenzyActive]);

  const coinUpgrades = [
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
      description: `Faster spawns\nEvery ${(baseSpawnInterval / 1000).toFixed(1)}s`,
      color: Colors.coinSilver,
    },
  ];

  const boosterUpgrades = [
    {
      id: "pointSurge" as const,
      title: "Point Surge",
      description: `2x points per drop\nCurrent: x${Math.pow(2, state.coinUpgrades.pointSurge.buys)}`,
      color: Colors.accent,
    },
    {
      id: "xpSurge" as const,
      title: "XP Surge",
      description: `2x XP per drop\nCurrent: x${Math.pow(2, state.coinUpgrades.xpSurge.buys)}`,
      color: Colors.xp,
    },
    {
      id: "autoCollector" as const,
      title: "Auto Collect",
      description: autoCollectorBuys > 0
        ? `Auto-collects coins\nEvery ${(autoCollectInterval / 1000).toFixed(1)}s`
        : "Auto-collects coins\nUnlocks at 4.0s interval",
      color: Colors.coinLegendary,
    },
    {
      id: "coinMultiplier" as const,
      title: "Coin Multi",
      description: `1.5x coin value\nCurrent: x${Math.pow(1.5, state.coinUpgrades.coinMultiplier.buys).toFixed(2)}`,
      color: Colors.prestige,
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
            <ComboCounter combo={combo} />
          </View>
        </View>

        <FrenzyButton
          unlocked={state.coinFrenzyUnlocked}
          canBuy={state.coins >= COIN_FRENZY_COST}
          onBuy={buyCoinFrenzy}
          onActivate={activateFrenzy}
          frenzyActive={frenzyActive}
          frenzyTimeLeft={frenzyTimeLeft}
          cooldownTimeLeft={cooldownTimeLeft}
        />

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
            <Text style={styles.statValue}>{(baseSpawnInterval / 1000).toFixed(1)}s</Text>
            <Text style={styles.statLabel}>SPAWN RATE</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>x{comboMult.toFixed(2)}</Text>
            <Text style={styles.statLabel}>COMBO</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COIN UPGRADES</Text>
          <View style={styles.upgradesGrid}>
            {coinUpgrades.map((upg) => {
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.accent }]}>BOOSTERS</Text>
          <View style={styles.upgradesGrid}>
            {boosterUpgrades.map((upg) => {
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

        {autoCollectorBuys > 0 && (
          <View style={styles.perkChip}>
            <Text style={styles.perkChipText}>
              AUTO-COLLECT EVERY {(autoCollectInterval / 1000).toFixed(1)}s
            </Text>
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
  comboContainer: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: Colors.coinGold + "22",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.coinGold + "44",
  },
  comboText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.coinGold,
    fontFamily: "Inter_700Bold",
  },
  comboLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.coinGold + "AA",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  frenzyWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  frenzyGlow: {
    position: "absolute",
    width: "104%",
    height: 62,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.coinGold,
  },
  frenzyButton: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.coinGold + "66",
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    gap: 4,
  },
  frenzyButtonActive: {
    borderColor: Colors.coinGold,
    backgroundColor: Colors.coinGold + "11",
  },
  frenzyButtonDisabled: {
    borderColor: Colors.bgBorder,
  },
  frenzyButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.coinGold,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  frenzyButtonSub: {
    fontSize: 11,
    color: Colors.coinGold + "AA",
    fontFamily: "Inter_500Medium",
  },
  frenzyActiveText: {
    color: Colors.coinGold,
  },
  frenzyTextDim: {
    color: Colors.textDim,
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
  perkChip: {
    backgroundColor: Colors.coinLegendary + "22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.coinLegendary + "44",
  },
  perkChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.coinLegendary,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
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
