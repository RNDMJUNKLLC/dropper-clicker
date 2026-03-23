import * as Haptics from "expo-haptics";
import React, { useCallback, useRef } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { formatNumber } from "@/utils/format";

interface FloatParticle {
  id: number;
  x: number;
}

interface DropButtonProps {
  onDrop: () => void;
  dropAmount: number;
}

function FloatingText({
  value,
  x,
  onDone,
}: {
  value: number;
  x: number;
  onDone: () => void;
}) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(-70, { duration: 900, easing: Easing.out(Easing.quad) });
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 700 }, (done) => {
        if (done) {
        }
      })
    );
    const timer = setTimeout(onDone, 950);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.floatText, { left: x - 30 }, style]}>
      <Text style={styles.floatTextLabel}>+{formatNumber(value)}</Text>
    </Animated.View>
  );
}

let particleId = 0;

export default function DropButton({ onDrop, dropAmount }: DropButtonProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.4);
  const [particles, setParticles] = React.useState<FloatParticle[]>([]);
  const dropCountRef = useRef(0);

  const handlePress = useCallback(() => {
    onDrop();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    scale.value = withSequence(
      withSpring(0.88, { damping: 8, stiffness: 400 }),
      withSpring(1.0, { damping: 12, stiffness: 300 })
    );
    glow.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0.4, { duration: 400 })
    );

    const id = particleId++;
    const x = 60 + Math.random() * 80;
    setParticles((prev) => [...prev, { id, x }]);
  }, [onDrop]);

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.container}>
      {particles.map((p) => (
        <FloatingText
          key={p.id}
          value={dropAmount}
          x={p.x}
          onDone={() => removeParticle(p.id)}
        />
      ))}

      <Animated.View style={[styles.glowRing, glowStyle]} />
      <Animated.View style={[styles.glowRingOuter, glowStyle]} />

      <Animated.View style={btnStyle}>
        <TouchableOpacity
          onPress={handlePress}
          style={styles.button}
          activeOpacity={0.8}
          testID="drop-button"
        >
          <View style={styles.innerCircle}>
            <Text style={styles.dropIcon}>◆</Text>
            <Text style={styles.dropLabel}>DROP</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const BTN_SIZE = 160;
const GLOW_SIZE = 200;
const GLOW_OUTER_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: Colors.accent + "22",
    borderWidth: 2,
    borderColor: Colors.accent + "66",
  },
  glowRingOuter: {
    position: "absolute",
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    borderRadius: GLOW_OUTER_SIZE / 2,
    backgroundColor: Colors.accent + "08",
    borderWidth: 1,
    borderColor: Colors.accent + "33",
  },
  button: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: Colors.bgCard,
    borderWidth: 2.5,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 20,
  },
  innerCircle: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dropIcon: {
    fontSize: 40,
    color: Colors.accent,
  },
  dropLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.accent,
    letterSpacing: 4,
    fontFamily: "Inter_700Bold",
  },
  floatText: {
    position: "absolute",
    top: -10,
    zIndex: 100,
  },
  floatTextLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
  },
});
