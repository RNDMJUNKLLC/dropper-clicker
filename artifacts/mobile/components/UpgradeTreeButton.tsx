import React from "react";
import { TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameContext";
import { UPGRADE_TREE } from "@/constants/upgradeTree";

interface UpgradeTreeButtonProps {
  onPress: () => void;
}

export default function UpgradeTreeButton({ onPress }: UpgradeTreeButtonProps) {
  const { state } = useGame();
  const purchased = state.purchasedTreeNodes.length;
  const total = UPGRADE_TREE.length;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name="file-tree"
        size={14}
        color={Colors.rebirth}
      />
      <Text style={styles.label}>
        {purchased}/{total}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.rebirth + "18",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.rebirth + "30",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.rebirth,
    fontFamily: "Inter_700Bold",
  },
});
