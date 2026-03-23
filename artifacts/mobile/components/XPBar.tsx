import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { formatNumber } from "@/utils/format";

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
          <View style={styles.shimmer} />
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
    backgroundColor: Colors.xp,
    borderRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
});
