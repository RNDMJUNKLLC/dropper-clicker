import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

export type CoinRarity = "common" | "uncommon" | "rare" | "legendary";

export interface SpawnedCoin {
  id: string;
  rarity: CoinRarity;
  value: number;
  x: number;
  y: number;
}

const RARITY_CONFIG: Record<
  CoinRarity,
  { color: string; symbol: string; size: number; glow: string }
> = {
  common: {
    color: Colors.coinBronze,
    symbol: "●",
    size: 44,
    glow: Colors.coinBronze + "44",
  },
  uncommon: {
    color: Colors.coinSilver,
    symbol: "◆",
    size: 48,
    glow: Colors.coinSilver + "55",
  },
  rare: {
    color: Colors.coinGold,
    symbol: "★",
    size: 52,
    glow: Colors.coinGold + "66",
  },
  legendary: {
    color: Colors.coinLegendary,
    symbol: "✦",
    size: 58,
    glow: Colors.coinLegendary + "77",
  },
};

interface CoinSpriteProps {
  coin: SpawnedCoin;
  onCollect: (coin: SpawnedCoin) => void;
}

export default function CoinSprite({ coin, onCollect }: CoinSpriteProps) {
  const config = RARITY_CONFIG[coin.rarity];
  const scale = useSharedValue(0);
  const floatY = useSharedValue(0);
  const collected = useSharedValue(false);
  const collectScale = useSharedValue(1);
  const collectOpacity = useSharedValue(1);
  const plusOpacity = useSharedValue(0);
  const plusY = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.back(1.5)),
    });

    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const handleCollect = () => {
    if (collected.value) return;
    collected.value = true;

    collectScale.value = withTiming(1.5, { duration: 150 });
    collectOpacity.value = withDelay(100, withTiming(0, { duration: 200 }));
    plusOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(600, withTiming(0, { duration: 300 }))
    );
    plusY.value = withTiming(-40, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onCollect(coin);
  };

  const coinStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * collectScale.value },
      { translateY: floatY.value },
    ],
    opacity: collectOpacity.value,
  }));

  const plusStyle = useAnimatedStyle(() => ({
    opacity: plusOpacity.value,
    transform: [{ translateY: plusY.value }],
  }));

  return (
    <Animated.View style={[styles.container, { left: coin.x, top: coin.y }]}>
      <Animated.View style={plusStyle}>
        <Text style={[styles.plusText, { color: config.color }]}>
          +{coin.value}
        </Text>
      </Animated.View>

      <TouchableOpacity onPress={handleCollect} activeOpacity={0.7}>
        <Animated.View
          style={[
            coinStyle,
            styles.coin,
            {
              width: config.size,
              height: config.size,
              borderRadius: config.size / 2,
              backgroundColor: config.color + "22",
              borderColor: config.color,
              boxShadow: `0 0 12px ${config.glow}`,
            },
          ]}
        >
          <Text
            style={[
              styles.symbol,
              {
                color: config.color,
                fontSize: config.size * 0.45,
              },
            ]}
          >
            {config.symbol}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
  },
  coin: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: {
    fontWeight: "700",
  },
  plusText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    position: "absolute",
    alignSelf: "center",
    bottom: 0,
  },
});
