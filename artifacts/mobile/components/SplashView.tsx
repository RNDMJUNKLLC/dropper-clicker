import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

export default function SplashView({ onReady }: { onReady: () => void }) {
  const titleOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.7);
  const subtitleOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const loaderOpacity = useSharedValue(0);
  const loaderPulse = useSharedValue(0.4);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    titleScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) });
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    glowOpacity.value = withDelay(200, withSequence(
      withTiming(0.6, { duration: 800 }),
      withTiming(0.2, { duration: 800 }),
    ));
    loaderOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    loaderPulse.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 600 }),
      ),
      -1,
    ));

    const timer = setTimeout(() => onReady(), 2000);
    return () => clearTimeout(timer);
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value * loaderPulse.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={titleStyle}>
        <Text style={styles.dropIcon}>💧</Text>
        <Text style={styles.title}>DROPPER</Text>
      </Animated.View>
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        incremental
      </Animated.Text>
      <Animated.View style={[styles.loader, loaderStyle]}>
        <ActivityIndicator size="small" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.accent,
  },
  dropIcon: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 10,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 6,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  loader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
  },
});
