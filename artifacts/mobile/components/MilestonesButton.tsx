import React, { useEffect } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface MilestonesButtonProps {
  onPress: () => void;
  isNew: boolean;
}

export default function MilestonesButton({
  onPress,
  isNew,
}: MilestonesButtonProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isNew) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isNew, pulse]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

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
        name="trophy-outline"
        size={16}
        color={Colors.rebirthAmber}
      />
      {isNew && (
        <Animated.View style={[styles.newBadge, badgeAnimStyle]}>
          <Text style={styles.newText}>NEW</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.rebirthAmber + "18",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.rebirthAmber + "30",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  newBadge: {
    backgroundColor: Colors.rebirthAmber,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.bg,
    letterSpacing: 0.5,
  },
});
