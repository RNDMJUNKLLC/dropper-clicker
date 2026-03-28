import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { GAMEPASSES, type GamepassId } from "@/constants/gamepasses";
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/utils/format";

interface GamepassModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GamepassModal({ visible, onClose }: GamepassModalProps) {
  const { state, buyGamepass, hasGamepass } = useGame();

  const handleBuy = (id: GamepassId) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    buyGamepass(id);
  };

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
                name="crown"
                size={20}
                color={Colors.gold}
              />
              <Text style={styles.title}>GAMEPASSES</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.goldRow}>
            <MaterialCommunityIcons
              name="circle"
              size={14}
              color={Colors.gold}
            />
            <Text style={styles.goldText}>
              {formatNumber(state.gold)} Gold
            </Text>
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {GAMEPASSES.map((pass) => {
              const owned = hasGamepass(pass.id);
              return (
                <View
                  key={pass.id}
                  style={[
                    styles.passCard,
                    owned && styles.passCardOwned,
                  ]}
                >
                  <View style={styles.passIcon}>
                    <MaterialCommunityIcons
                      name={pass.icon as any}
                      size={24}
                      color={owned ? Colors.gold : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.passInfo}>
                    <Text
                      style={[
                        styles.passName,
                        owned && { color: Colors.gold },
                      ]}
                    >
                      {pass.name}
                    </Text>
                    <Text style={styles.passDesc}>{pass.description}</Text>
                  </View>
                  {owned ? (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>OWNED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.buyBtn}
                      onPress={() => handleBuy(pass.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.buyText}>
                        {pass.goldCost === 0
                          ? "FREE"
                          : `${formatNumber(pass.goldCost)} G`}
                      </Text>
                    </TouchableOpacity>
                  )}
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
    borderColor: Colors.gold + "30",
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  goldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  goldText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.gold,
    fontFamily: "Inter_700Bold",
  },
  list: {
    flexGrow: 0,
  },
  passCard: {
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
  passCardOwned: {
    borderColor: Colors.gold + "40",
    backgroundColor: Colors.gold + "08",
  },
  passIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  passInfo: {
    flex: 1,
    gap: 2,
  },
  passName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  passDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  ownedBadge: {
    backgroundColor: Colors.gold + "20",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.gold + "40",
  },
  ownedText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.gold,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  buyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buyText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.bg,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
