import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MILESTONES, isFutureEffect } from "@/constants/milestones";
import Colors from "@/constants/colors";

interface MilestonesModalProps {
  visible: boolean;
  onClose: () => void;
  currentLevel: number;
  rebirthTier: number;
}

export default function MilestonesModal({
  visible,
  onClose,
  currentLevel,
  rebirthTier,
}: MilestonesModalProps) {
  const active = rebirthTier >= 5;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={20}
                color={Colors.rebirthAmber}
              />
              <Text style={styles.title}>MILESTONES</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {!active && (
            <View style={styles.lockedRow}>
              <Text style={styles.lockedText}>
                Reach Rebirth Tier 5 to unlock milestones.
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {MILESTONES.map((milestone) => {
              const reached = active && currentLevel >= milestone.level;
              const hasFuture = milestone.effects.some((e) =>
                isFutureEffect(e.type)
              );

              return (
                <View
                  key={milestone.level}
                  style={[styles.row, reached && styles.rowReached]}
                >
                  <View
                    style={[
                      styles.levelBadge,
                      reached
                        ? styles.levelBadgeReached
                        : styles.levelBadgeLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelText,
                        reached
                          ? styles.levelTextReached
                          : styles.levelTextLocked,
                      ]}
                    >
                      {milestone.level}
                    </Text>
                  </View>

                  <View style={styles.descriptionContainer}>
                    <Text
                      style={[
                        styles.description,
                        reached
                          ? styles.descriptionReached
                          : styles.descriptionLocked,
                      ]}
                    >
                      {milestone.description}
                    </Text>
                    {hasFuture && (
                      <Text style={styles.comingSoon}>Coming Soon</Text>
                    )}
                  </View>

                  <MaterialCommunityIcons
                    name={reached ? "check-circle" : "lock-outline"}
                    size={18}
                    color={reached ? Colors.rebirthAmber : Colors.textDim}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.rebirthAmber + "30",
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.rebirthAmber,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  lockedRow: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  lockedText: {
    fontSize: 13,
    color: Colors.textDim,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 12,
  },
  rowReached: {
    borderColor: Colors.rebirthAmber + "40",
    backgroundColor: Colors.rebirthAmber + "08",
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadgeReached: {
    backgroundColor: Colors.rebirthAmber + "20",
  },
  levelBadgeLocked: {
    backgroundColor: Colors.bgCard,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  levelTextReached: {
    color: Colors.rebirthAmber,
  },
  levelTextLocked: {
    color: Colors.textDim,
  },
  descriptionContainer: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  descriptionReached: {
    color: Colors.textPrimary,
  },
  descriptionLocked: {
    color: Colors.textSecondary,
  },
  comingSoon: {
    fontSize: 11,
    fontStyle: "italic",
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
  },
});
