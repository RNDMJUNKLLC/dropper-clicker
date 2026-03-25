import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  withRepeat,
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
  cooldownMs: number;
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
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    const horizontalDrift = (Math.random() - 0.5) * 40;
    translateY.value = withTiming(-70, { duration: 900, easing: Easing.out(Easing.quad) });
    translateX.value = withTiming(horizontalDrift, { duration: 900, easing: Easing.out(Easing.quad) });
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 700 })
    );
    const timer = setTimeout(onDone, 950);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View style={[styles.floatText, { left: x - 30 }, style]}>
      <Text style={styles.floatTextLabel}>+{formatNumber(value)}</Text>
    </Animated.View>
  );
}

let particleId = 0;

export default function DropButton({ onDrop, dropAmount, cooldownMs }: DropButtonProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.4);
  const [particles, setParticles] = React.useState<FloatParticle[]>([]);
  const [onCooldown, setOnCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownProgress = useSharedValue(1);
  const idlePulse = useSharedValue(1);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!onCooldown) {
      idlePulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      idlePulse.value = withTiming(1.0, { duration: 200 });
    }
  }, [onCooldown]);

  const handlePress = useCallback(() => {
    if (onCooldown) return;
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

    setOnCooldown(true);
    cooldownProgress.value = 0;
    cooldownProgress.value = withTiming(1, { duration: cooldownMs });
    cooldownTimerRef.current = setTimeout(() => {
      setOnCooldown(false);
    }, cooldownMs);
  }, [onDrop, onCooldown, cooldownMs]);

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * idlePulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const cooldownBarStyle = useAnimatedStyle(() => ({
    width: `${cooldownProgress.value * 100}%`,
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

      <Animated.View style={[styles.glowRingOuter, glowStyle]}>
        <LinearGradient
          colors={[Colors.accent + "00", Colors.accent + "15", Colors.accent + "00"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.glowRing, glowStyle]}>
        <LinearGradient
          colors={[Colors.accent + "00", Colors.accent + "30", Colors.accent + "00"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={btnStyle}>
        <TouchableOpacity
          onPress={handlePress}
          style={[
            styles.button,
            onCooldown && styles.buttonCooldown,
          ]}
          activeOpacity={0.8}
          testID="drop-button"
        >
          <View style={styles.innerCircle}>
            <Text style={[styles.dropIcon, onCooldown && styles.dimText]}>◆</Text>
            <Text style={[styles.dropLabel, onCooldown && styles.dimText]}>DROP</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.cooldownTrack}>
        <Animated.View style={[styles.cooldownFill, cooldownBarStyle]} />
      </View>
    </View>
  );
}

const BTN_SIZE = 160;
const GLOW_SIZE = 200;
const GLOW_OUTER_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    width: BTN_SIZE,
    height: BTN_SIZE + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    top: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: Colors.accent + "44",
  },
  glowRingOuter: {
    position: "absolute",
    top: -20,
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    borderRadius: GLOW_OUTER_SIZE / 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.accent + "22",
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
  buttonCooldown: {
    borderColor: Colors.accentDim,
    opacity: 0.7,
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
  dimText: {
    color: Colors.accentDim,
  },
  cooldownTrack: {
    width: BTN_SIZE - 20,
    height: 4,
    backgroundColor: Colors.bgBorder,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  cooldownFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 2,
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
