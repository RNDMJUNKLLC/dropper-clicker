import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Colors, { Gradients } from "@/constants/colors";
import { formatNumber } from "@/utils/format";

function AnimatedShimmer() {
  const translateX = useSharedValue(-60);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.25)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );
}

interface XPBarProps {
  xp: number;
  xpRequired: number;
  level: number;
  progress: number;
}

export default function XPBar({ xp, xpRequired, level, progress }: XPBarProps) {
  const width = useSharedValue(progress);

  useEffect(() => {
    width.value = withSpring(progress, { damping: 15, stiffness: 120 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(width.value * 100, 100)}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelLabel}>LVL {level}</Text>
        <Text style={styles.xpText}>
          {formatNumber(xp)} / {formatNumber(xpRequired)} XP
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]}>
          <LinearGradient
            colors={Gradients.xpBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <AnimatedShimmer />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.xp,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  xpText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  track: {
    height: 8,
    backgroundColor: Colors.bgBorder,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
  shimmerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
  },
  shimmerGradient: {
    flex: 1,
  },
});
