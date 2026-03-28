import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import UpgradeTree from "./UpgradeTree";

interface UpgradeTreeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UpgradeTreeModal({
  visible,
  onClose,
}: UpgradeTreeModalProps) {
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
                name="file-tree"
                size={18}
                color={Colors.rebirth}
              />
              <Text style={styles.title}>UPGRADE TREE</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <UpgradeTree />
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
    borderColor: Colors.rebirth + "30",
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.rebirth,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flexGrow: 0,
  },
});
