import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameContext";

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { coinsUnlocked } = useGame();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textDim,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: Colors.bgBorder,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bgCard }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Game",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="water-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coins"
        options={{
          title: "Coins",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name={coinsUnlocked ? "circle-multiple" : "lock"}
              size={24}
              color={coinsUnlocked ? color : Colors.textDim}
            />
          ),
          tabBarLabelStyle: coinsUnlocked ? {} : { color: Colors.textDim },
        }}
      />
    </Tabs>
  );
}
