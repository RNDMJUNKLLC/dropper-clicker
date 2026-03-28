import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface GamepassButtonProps {
  onPress: () => void;
}

export default function GamepassButton({ onPress }: GamepassButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name="crown"
        size={16}
        color={Colors.gold}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gold + "18",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gold + "30",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
});
