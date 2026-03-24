import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 20);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>SETTINGS</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ACCOUNT</Text>
          {isLoading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : isAuthenticated && user ? (
            <View style={styles.userSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.firstName
                    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                    : user.email || "Player"}
                </Text>
                {user.email && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.guestText}>Playing as Guest</Text>
          )}

          <Text style={styles.syncHint}>
            {isAuthenticated
              ? "Your progress can sync across devices"
              : "Log in to save your progress across devices"}
          </Text>

          <Pressable
            style={[
              styles.authButton,
              isAuthenticated && styles.logoutButton,
            ]}
            onPress={isAuthenticated ? logout : login}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.authButtonText,
                isAuthenticated && styles.logoutButtonText,
              ]}
            >
              {isLoading
                ? "Loading..."
                : isAuthenticated
                  ? "Log Out"
                  : "Log In"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ABOUT</Text>
          <Text style={styles.aboutText}>Dropper Clicker v1.0.0</Text>
          <Text style={styles.aboutDim}>
            An incremental game with drops, prestige, rebirth, and coins.
          </Text>
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
    padding: 20,
    gap: 20,
  },
  header: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    paddingTop: 8,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 12,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textDim,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent + "22",
    borderWidth: 1,
    borderColor: Colors.accent + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  guestText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  syncHint: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  authButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  authButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.bg,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  logoutButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.danger + "66",
  },
  logoutButtonText: {
    color: Colors.danger,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  aboutDim: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
