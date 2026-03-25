export type TreeCurrency = "points" | "prestigePoints" | "coins" | "readingPoints";

export type TreeEffectType =
  | "pointsMult"
  | "xpMult"
  | "coinsMult"
  | "readingPointsMult"
  | "fasterSpawn"
  | "spawnCap"
  | "spawnBulk"
  | "unlockReading"
  | "cheaperBooks"
  | "pointsBoostByPP"
  | "xpBoostByCoins";

export interface TreeNode {
  id: string;
  name: string;
  description: string;
  row: number;
  cost: number;
  currency: TreeCurrency;
  effectType: TreeEffectType;
  effectValue: number;
  requiresLevel?: number;
  requiresRebirthTier?: number;
}

export const UPGRADE_TREE: TreeNode[] = [
  { id: "r1_morePoints", name: "More Points", description: "x3 points", row: 1, cost: 2.5e6, currency: "points", effectType: "pointsMult", effectValue: 3 },

  { id: "r2_moreXP", name: "More XP", description: "2x XP", row: 2, cost: 1.5e9, currency: "points", effectType: "xpMult", effectValue: 2 },

  { id: "r3_moreCoins", name: "More Coins", description: "x3 coins", row: 3, cost: 1e10, currency: "points", effectType: "coinsMult", effectValue: 3 },

  { id: "r4_morePoints", name: "More Points", description: "x5 points", row: 4, cost: 2.5e9, currency: "prestigePoints", effectType: "pointsMult", effectValue: 5 },

  { id: "r5_fasterSpawn", name: "Faster Spawn", description: "Doubles coin spawn rate", row: 5, cost: 2.5e11, currency: "points", effectType: "fasterSpawn", effectValue: 2 },
  { id: "r5_spawnCap", name: "More Spawn Cap", description: "+10 coin capacity", row: 5, cost: 1.5e11, currency: "points", effectType: "spawnCap", effectValue: 10 },
  { id: "r5_spawnBulk", name: "More Spawn Bulk", description: "+1 coin spawn", row: 5, cost: 1e11, currency: "points", effectType: "spawnBulk", effectValue: 1 },

  { id: "r6_moreCoins", name: "More Coins", description: "x3 coins", row: 6, cost: 1e12, currency: "prestigePoints", effectType: "coinsMult", effectValue: 3 },
  { id: "r6_pointsBoost", name: "More Points", description: "+10% points per 1B PP", row: 6, cost: 5e11, currency: "points", effectType: "pointsBoostByPP", effectValue: 0.1 },

  { id: "r7_moreRP", name: "More Reading Pts", description: "x3 reading points", row: 7, cost: 20000, currency: "coins", effectType: "readingPointsMult", effectValue: 3 },
  { id: "r7_unlockReading", name: "Unlock Reading", description: "Unlocks reading, 2x coins", row: 7, cost: 10000, currency: "coins", effectType: "unlockReading", effectValue: 2 },
  { id: "r7_moreCoins", name: "More Coins", description: "x3 coins", row: 7, cost: 100, currency: "readingPoints", effectType: "coinsMult", effectValue: 3 },

  { id: "r8_morePoints", name: "More Points", description: "x3 points", row: 8, cost: 1500, currency: "readingPoints", effectType: "pointsMult", effectValue: 3 },

  { id: "r9_cheaperBooks", name: "Cheaper Books", description: "50% less book price scaling", row: 9, cost: 150000, currency: "coins", effectType: "cheaperBooks", effectValue: 0.5, requiresRebirthTier: 2 },
  { id: "r9_moreXP", name: "More XP", description: "x3 XP", row: 9, cost: 75000, currency: "readingPoints", effectType: "xpMult", effectValue: 3, requiresRebirthTier: 2 },
  { id: "r9_xpBoost", name: "More XP", description: "+10% XP per 1B coins", row: 9, cost: 3e22, currency: "points", effectType: "xpBoostByCoins", effectValue: 0.1, requiresRebirthTier: 2, requiresLevel: 14 },

  { id: "r10_morePoints", name: "More Points", description: "x5 points", row: 10, cost: 500000, currency: "readingPoints", effectType: "pointsMult", effectValue: 5, requiresRebirthTier: 2 },
  { id: "r10_moreCoins", name: "More Coins", description: "x5 coins", row: 10, cost: 1e24, currency: "points", effectType: "coinsMult", effectValue: 5, requiresRebirthTier: 2 },
  { id: "r10_moreRP", name: "More Reading Pts", description: "x5 reading points", row: 10, cost: 500000, currency: "coins", effectType: "readingPointsMult", effectValue: 5, requiresRebirthTier: 2 },
];

export const TREE_ROW_COUNT = 10;

export function getNodesInRow(row: number): TreeNode[] {
  return UPGRADE_TREE.filter((n) => n.row === row);
}

export function isRowComplete(row: number, purchased: string[]): boolean {
  const nodes = getNodesInRow(row);
  return nodes.length > 0 && nodes.every((n) => purchased.includes(n.id));
}

export function isNodeAvailable(
  node: TreeNode,
  purchased: string[],
  rebirthTier: number,
  level: number
): boolean {
  if (purchased.includes(node.id)) return false;
  if (node.requiresRebirthTier && rebirthTier < node.requiresRebirthTier) return false;
  if (node.requiresLevel && level < node.requiresLevel) return false;
  for (let r = 1; r < node.row; r++) {
    if (!isRowComplete(r, purchased)) return false;
  }
  return true;
}

export function getTreeMultiplier(
  effectType: TreeEffectType,
  purchased: string[]
): number {
  let mult = 1;
  for (const node of UPGRADE_TREE) {
    if (!purchased.includes(node.id)) continue;
    if (node.effectType === effectType) {
      mult *= node.effectValue;
    }
  }
  return mult;
}
