import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

export default function UserIndicator() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated || !user) return null;

  const initials = (user.firstName?.[0] || user.email?.[0] || "?").toUpperCase();

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push("/settings" as any)}
    >
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {user.firstName || user.email?.split("@")[0] || "Player"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    alignSelf: "flex-end",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: "Inter_700Bold",
  },
  name: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    maxWidth: 80,
  },
});
