import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import {
  TREE_ROW_COUNT,
  getNodesInRow,
  isNodeAvailable,
  isRowComplete,
} from "@/constants/upgradeTree";
import { useGame, getCurrencyAmount } from "@/context/GameContext";
import TreeNodeCard from "./TreeNodeCard";

export default function UpgradeTree() {
  const { state, buyTreeNode } = useGame();

  const rows = useMemo(() => {
    const result: {
      row: number;
      nodes: ReturnType<typeof getNodesInRow>;
      complete: boolean;
      prevComplete: boolean;
      rebirthLocked: boolean;
    }[] = [];

    for (let r = 1; r <= TREE_ROW_COUNT; r++) {
      const nodes = getNodesInRow(r);
      const complete = isRowComplete(r, state.purchasedTreeNodes);
      const prevComplete = r === 1 || isRowComplete(r - 1, state.purchasedTreeNodes);
      const rebirthLocked = nodes.some(
        (n) => n.requiresRebirthTier && state.rebirthTier < n.requiresRebirthTier
      );
      result.push({ row: r, nodes, complete, prevComplete, rebirthLocked });
    }
    return result;
  }, [state.purchasedTreeNodes, state.rebirthTier]);

  const totalNodes = rows.reduce((s, r) => s + r.nodes.length, 0);
  const purchasedCount = state.purchasedTreeNodes.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>UPGRADE TREE</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            {purchasedCount}/{totalNodes}
          </Text>
        </View>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${totalNodes > 0 ? (purchasedCount / totalNodes) * 100 : 0}%` },
          ]}
        />
      </View>

      {rows.map((rowData, idx) => {
        const { row, nodes, complete, prevComplete, rebirthLocked } = rowData;
        const rowPurchased = nodes.filter((n) =>
          state.purchasedTreeNodes.includes(n.id)
        ).length;

        return (
          <View key={row}>
            {idx > 0 && (
              <View style={styles.connector}>
                <View
                  style={[
                    styles.connectorLine,
                    complete && idx < rows.length
                      ? { backgroundColor: Colors.accent + "66" }
                      : {},
                  ]}
                />
              </View>
            )}

            <View style={styles.rowContainer}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowLabel}>ROW {row}</Text>
                {rebirthLocked ? (
                  <Text style={styles.rowLock}>REBIRTH T2</Text>
                ) : complete ? (
                  <Text style={styles.rowComplete}>COMPLETE</Text>
                ) : (
                  <Text style={styles.rowProgress}>
                    {rowPurchased}/{nodes.length}
                  </Text>
                )}
              </View>

              <View style={styles.nodesRow}>
                {nodes.map((node) => {
                  const purchased = state.purchasedTreeNodes.includes(node.id);
                  const available = isNodeAvailable(
                    node,
                    state.purchasedTreeNodes,
                    state.rebirthTier,
                    state.level
                  );
                  const canAfford =
                    getCurrencyAmount(state, node.currency) >= node.cost;

                  let lockedReason: string | null = null;
                  if (!purchased && !available) {
                    if (
                      node.requiresRebirthTier &&
                      state.rebirthTier < node.requiresRebirthTier
                    ) {
                      lockedReason = `Rebirth Tier ${node.requiresRebirthTier}`;
                    } else if (
                      node.requiresLevel &&
                      state.level < node.requiresLevel
                    ) {
                      lockedReason = `Level ${node.requiresLevel}`;
                    } else if (!prevComplete) {
                      lockedReason = "Complete previous row";
                    }
                  }

                  return (
                    <TreeNodeCard
                      key={node.id}
                      node={node}
                      purchased={purchased}
                      available={available}
                      canAfford={canAfford}
                      lockedReason={lockedReason}
                      onBuy={() => buyTreeNode(node.id)}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.rebirth,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  progressBadge: {
    backgroundColor: Colors.rebirth + "22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.rebirth,
    fontFamily: "Inter_600SemiBold",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: Colors.bgBorder,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.rebirth,
    borderRadius: 2,
  },
  connector: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
  },
  connectorLine: {
    width: 2,
    height: 18,
    backgroundColor: Colors.bgBorder,
    borderRadius: 1,
  },
  rowContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textDim,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  rowLock: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.rebirth,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  rowComplete: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.xp,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  rowProgress: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  nodesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
