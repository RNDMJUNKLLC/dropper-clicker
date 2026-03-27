export type MilestoneEffectType =
  | "xpMult"
  | "coinsMult"
  | "pointsMult"
  | "prestigePointsMult"
  | "readingUpgradesCap"
  | "newTreeNode"
  | "coinAutoCollect"
  | "ppPerSecondFull"
  | "newFeaturePlaceholder"
  | "crystalsMult"
  | "fireMult"
  | "diamondsMult"
  | "bonesMult";

export interface MilestoneEffect {
  type: MilestoneEffectType;
  value: number;
}

export interface Milestone {
  level: number;
  description: string;
  effects: MilestoneEffect[];
}

export const MILESTONES: Milestone[] = [
  {
    level: 13,
    description: "x3 XP, x3 Coins, +250 Reading Upgrades Cap",
    effects: [
      { type: "xpMult", value: 3 },
      { type: "coinsMult", value: 3 },
      { type: "readingUpgradesCap", value: 250 },
    ],
  },
  {
    level: 14,
    description: "New Tree Upgrade, x3 Prestige Points, Coin Auto-Collect",
    effects: [
      { type: "newTreeNode", value: 1 },
      { type: "prestigePointsMult", value: 3 },
      { type: "coinAutoCollect", value: 1 },
    ],
  },
  {
    level: 15,
    description: "Unlock New Feature",
    effects: [{ type: "newFeaturePlaceholder", value: 1 }],
  },
  {
    level: 16,
    description: "100% PP Per Second",
    effects: [{ type: "ppPerSecondFull", value: 1 }],
  },
  {
    level: 22,
    description: "x3 Points",
    effects: [{ type: "pointsMult", value: 3 }],
  },
  {
    level: 25,
    description: "x3 XP",
    effects: [{ type: "xpMult", value: 3 }],
  },
  {
    level: 28,
    description: "x3 Prestige Points",
    effects: [{ type: "prestigePointsMult", value: 3 }],
  },
  {
    level: 31,
    description: "x3 Coins",
    effects: [{ type: "coinsMult", value: 3 }],
  },
  {
    level: 34,
    description: "x3 Crystals",
    effects: [{ type: "crystalsMult", value: 3 }],
  },
  {
    level: 37,
    description: "x3 Fire",
    effects: [{ type: "fireMult", value: 3 }],
  },
  {
    level: 40,
    description: "x3 Diamonds",
    effects: [{ type: "diamondsMult", value: 3 }],
  },
  {
    level: 42,
    description: "x3 Bones",
    effects: [{ type: "bonesMult", value: 3 }],
  },
];

const READING_UPGRADES_BASE_CAP = 250;

const FUTURE_EFFECTS: Set<MilestoneEffectType> = new Set([
  "crystalsMult",
  "fireMult",
  "diamondsMult",
  "bonesMult",
]);

export function isFutureEffect(type: MilestoneEffectType): boolean {
  return FUTURE_EFFECTS.has(type);
}

export function getMilestoneMultiplier(
  effectType: MilestoneEffectType,
  level: number,
  rebirthTier: number
): number {
  if (rebirthTier < 5) return 1;
  let mult = 1;
  for (const milestone of MILESTONES) {
    if (level < milestone.level) continue;
    for (const effect of milestone.effects) {
      if (effect.type === effectType) {
        mult *= effect.value;
      }
    }
  }
  return mult;
}

export function getReadingUpgradesCap(
  level: number,
  rebirthTier: number
): number | null {
  if (rebirthTier < 5) return null;
  let cap = READING_UPGRADES_BASE_CAP;
  for (const milestone of MILESTONES) {
    if (level < milestone.level) continue;
    for (const effect of milestone.effects) {
      if (effect.type === "readingUpgradesCap") {
        cap += effect.value;
      }
    }
  }
  return cap;
}

export function isCoinAutoCollectUnlocked(
  level: number,
  rebirthTier: number
): boolean {
  return rebirthTier >= 5 && level >= 14;
}

export function isPPFullPercentUnlocked(
  level: number,
  rebirthTier: number
): boolean {
  return rebirthTier >= 5 && level >= 16;
}

export function getActiveMilestones(level: number): Milestone[] {
  return MILESTONES.filter((m) => level >= m.level);
}
