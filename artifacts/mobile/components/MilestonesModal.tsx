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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={20}
                color={Colors.rebirthAmber}
              />
              <Text style={styles.title}>MILESTONES</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {!active && (
            <Text style={styles.lockedText}>
              Reach Rebirth Tier 5 to unlock milestones.
            </Text>
          )}

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {MILESTONES.map((milestone) => {
              const reached = active && currentLevel >= milestone.level;
              const hasFuture = milestone.effects.some((e) => isFutureEffect(e.type));

              return (
                <View
                  key={milestone.level}
                  style={[
                    styles.row,
                    reached && styles.rowReached,
                  ]}
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.rebirthAmber,
    letterSpacing: 1.5,
  },
  lockedText: {
    fontSize: 13,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    padding: 10,
    gap: 10,
  },
  rowReached: {
    borderColor: Colors.rebirthAmber + "40",
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadgeReached: {
    backgroundColor: Colors.rebirthAmber + "20",
  },
  levelBadgeLocked: {
    backgroundColor: Colors.bgBorder,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "700",
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
  },
});
