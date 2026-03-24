import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

export default function LoginScreen({ onSkip }: { onSkip: () => void }) {
  const { login, isLoading } = useAuth();
  const contentOpacity = useSharedValue(0);

  React.useEffect(() => {
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, contentStyle]}>
        <Text style={styles.dropIcon}>💧</Text>
        <Text style={styles.title}>DROPPER</Text>
        <Text style={styles.subtitle}>incremental</Text>

        <View style={styles.authSection}>
          <Pressable
            style={styles.loginButton}
            onPress={login}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Loading..." : "Log In"}
            </Text>
          </Pressable>

          <Text style={styles.loginHint}>
            Sign in to save your progress across devices
          </Text>

          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Play as Guest</Text>
          </Pressable>
        </View>
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
    padding: 32,
  },
  content: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 320,
  },
  dropIcon: {
    fontSize: 56,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 10,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 6,
    fontFamily: "Inter_400Regular",
    marginBottom: 32,
  },
  authSection: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  loginButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.bg,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  loginHint: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
});
