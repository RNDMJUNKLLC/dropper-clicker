import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "@/lib/auth";
import {
  fetchCloudSave,
  pushCloudSave,
  type CloudSyncStatus,
} from "@/lib/cloudSync";
import {
  UPGRADE_TREE,
  getTreeMultiplier,
  isNodeAvailable,
  type TreeCurrency,
} from "@/constants/upgradeTree";
import {
  getMilestoneMultiplier,
  getReadingUpgradesCap,
  isPPFullPercentUnlocked,
} from "@/constants/milestones";
import { GAMEPASSES, type GamepassId } from "@/constants/gamepasses";

export interface DropUpgrade {
  id: "dropAmount" | "dropXP" | "rapidDrop";
  buys: number;
  maxBuys: number;
  baseCost: number;
}

export interface PrestigeUpgrade {
  id: "morePoints" | "moreXP" | "morePP";
  buys: number;
  maxBuys: number;
  baseCost: number;
}

export interface CoinUpgrade {
  id: "moreCash" | "moreXP" | "fasterSpawn";
  buys: number;
  maxBuys: number;
  baseCost: number;
}

export type ReadingUpgradeId = "morePoints" | "moreXP" | "moreRP";

export interface GameState {
  points: number;
  runPoints: number;
  lifetimePoints: number;
  totalDrops: number;
  xp: number;
  level: number;
  prestigePoints: number;
  rebirthCount: number;
  rebirthTier: number;
  dropUpgrades: {
    dropAmount: DropUpgrade;
    dropXP: DropUpgrade;
    rapidDrop: DropUpgrade;
  };
  prestigeUpgrades: {
    morePoints: PrestigeUpgrade;
    moreXP: PrestigeUpgrade;
    morePP: PrestigeUpgrade;
  };
  coins: number;
  lifetimeCoins: number;
  coinUpgrades: {
    moreCash: CoinUpgrade;
    moreXP: CoinUpgrade;
    fasterSpawn: CoinUpgrade;
  };
  purchasedTreeNodes: string[];
  reading: {
    books: number;
    readingPoints: number;
    upgrades: {
      morePoints: number;
      moreXP: number;
      moreRP: number;
    };
  };
  milestonesSeen: boolean;
  gold: number;
  ownedGamepasses: string[];
}

type Action =
  | { type: "DROP" }
  | { type: "BUY_DROP_UPGRADE"; id: DropUpgrade["id"] }
  | { type: "BUY_MAX_DROP_UPGRADE"; id: DropUpgrade["id"] }
  | { type: "BUY_PRESTIGE_UPGRADE"; id: PrestigeUpgrade["id"] }
  | { type: "BUY_MAX_PRESTIGE_UPGRADE"; id: PrestigeUpgrade["id"] }
  | { type: "COLLECT_COIN"; value: number }
  | { type: "BUY_COIN_UPGRADE"; id: CoinUpgrade["id"] }
  | { type: "BUY_MAX_COIN_UPGRADE"; id: CoinUpgrade["id"] }
  | { type: "BUY_TREE_NODE"; nodeId: string }
  | { type: "BUY_BOOK" }
  | { type: "INVEST_READING"; category: ReadingUpgradeId; amount: number }
  | { type: "TICK_READING" }
  | { type: "TICK_PASSIVE_PP" }
  | { type: "AUTO_BUY_DROP_UPGRADE" }
  | { type: "AUTO_BUY_PRESTIGE_UPGRADE" }
  | { type: "AUTO_BUY_BOOK" }
  | { type: "AUTO_INVEST_READING" }
  | { type: "AUTO_BUY_COIN_UPGRADE" }
  | { type: "PRESTIGE" }
  | { type: "REBIRTH"; which: 1 | 2 | 3 | 4 | 5 }
  | { type: "SET_MILESTONES_SEEN" }
  | { type: "BUY_GAMEPASS"; id: GamepassId }
  | { type: "RESET_GAME" }
  | { type: "LOAD"; state: GameState };

const XP_BASE = 100;
const XP_SCALE = 5;
const DROP_COST_SCALE = 1.14;
const PRESTIGE_COST_SCALE = 1.5;
const CLICK_COOLDOWN_BASE = 2000;
const CLICK_COOLDOWN_REDUCTION = 300;
const CLICK_COOLDOWN_MIN = 500;

export const REBIRTH_THRESHOLDS = [0, 1e15, 2.5e16, 5e17, 2.5e19, 1e21];
const REBIRTH_MIN_LEVEL = 10;

export function xpForLevel(level: number): number {
  return XP_BASE * Math.pow(XP_SCALE, level - 1);
}

export function getLevelPointsMult(level: number): number {
  return 1 + (level - 1) * 2.5;
}

export function getLevelXPMult(level: number): number {
  return 1 + (level - 1) * 0.5;
}

export function dropUpgradeCost(upgrade: DropUpgrade): number {
  return Math.ceil(upgrade.baseCost * Math.pow(DROP_COST_SCALE, upgrade.buys));
}

export function prestigeUpgradeCost(upgrade: PrestigeUpgrade): number {
  return upgrade.baseCost * Math.pow(PRESTIGE_COST_SCALE, upgrade.buys);
}

export function getEffectivePrestigeMaxBuys(
  baseMax: number
): number {
  return baseMax;
}

export function getEffectiveDropMaxBuys(
  upgrade: DropUpgrade,
  tier2: boolean
): number {
  if (upgrade.id === "rapidDrop") return upgrade.maxBuys;
  return tier2 ? upgrade.maxBuys + 25 : upgrade.maxBuys;
}

export function calcPrestigePoints(currentPoints: number): number {
  return Math.floor(currentPoints / 1000);
}

export function coinUpgradeCost(upgrade: CoinUpgrade): number {
  const scale = upgrade.id === "fasterSpawn" ? 3 : 5;
  return Math.ceil(upgrade.baseCost * Math.pow(scale, upgrade.buys));
}

export function getClickCooldownMs(state: GameState): number {
  const reduction = state.dropUpgrades.rapidDrop.buys * CLICK_COOLDOWN_REDUCTION;
  return Math.max(CLICK_COOLDOWN_MIN, CLICK_COOLDOWN_BASE - reduction);
}

function getDropAmount(state: GameState): number {
  const baseAmount = 1 + state.dropUpgrades.dropAmount.buys;
  const levelMult = getLevelPointsMult(state.level);
  const prestigeMult = Math.pow(2, state.prestigeUpgrades.morePoints.buys);
  const coinUpgMult = Math.pow(2, state.coinUpgrades.moreCash.buys);
  const treePtsMult = getTreeMultiplier("pointsMult", state.purchasedTreeNodes);
  const readingMult = 1 + state.reading.upgrades.morePoints * 0.01;
  const rebirthStatMult =
    state.rebirthTier >= 1 ? Math.pow(2, state.rebirthCount) : 1;

  let ppBoost = 1;
  if (state.purchasedTreeNodes.includes("r6_pointsBoost")) {
    ppBoost = 1 + (state.prestigePoints / 1e9) * 0.1;
  }

  const milestoneMult = getMilestoneMultiplier("pointsMult", state.level, state.rebirthTier);
  const gamepassMult = state.ownedGamepasses.includes("doublePoints") ? 2 : 1;

  return Math.floor(
    baseAmount *
      levelMult *
      prestigeMult *
      coinUpgMult *
      treePtsMult *
      readingMult *
      rebirthStatMult *
      ppBoost *
      milestoneMult *
      gamepassMult
  );
}

function getXPAmount(state: GameState): number {
  const baseXP = 1 + state.dropUpgrades.dropXP.buys;
  const levelMult = getLevelXPMult(state.level);
  const prestigeMult = Math.pow(2, state.prestigeUpgrades.moreXP.buys);
  const coinUpgMult = Math.pow(2, state.coinUpgrades.moreXP.buys);
  const treeXPMult = getTreeMultiplier("xpMult", state.purchasedTreeNodes);
  const readingMult = 1 + state.reading.upgrades.moreXP * 0.01;
  const rebirthStatMult =
    state.rebirthTier >= 1 ? Math.pow(2, state.rebirthCount) : 1;

  let coinsBoost = 1;
  if (state.purchasedTreeNodes.includes("r9_xpBoost")) {
    coinsBoost = 1 + (state.coins / 1e9) * 0.1;
  }

  let coinsBoost2 = 1;
  if (state.purchasedTreeNodes.includes("r11_xpByCoins")) {
    coinsBoost2 = 1 + (state.coins / 1e9) * 1;
  }

  const milestoneMult = getMilestoneMultiplier("xpMult", state.level, state.rebirthTier);
  const gamepassMult = state.ownedGamepasses.includes("doubleXP") ? 2 : 1;

  return Math.floor(
    baseXP *
      levelMult *
      prestigeMult *
      coinUpgMult *
      treeXPMult *
      readingMult *
      rebirthStatMult *
      coinsBoost *
      coinsBoost2 *
      milestoneMult *
      gamepassMult
  );
}

function getCoinValueMultiplier(state: GameState): number {
  let treeMult = 1;
  for (const node of UPGRADE_TREE) {
    if (!state.purchasedTreeNodes.includes(node.id)) continue;
    if (node.effectType === "coinsMult") treeMult *= node.effectValue;
    if (node.effectType === "unlockReading") treeMult *= node.effectValue;
  }
  const rebirthFlatMult = state.rebirthTier >= 1 ? 3 : 1;
  const rebirthStatMult =
    state.rebirthTier >= 1 ? Math.pow(2, state.rebirthCount) : 1;
  const milestoneMult = getMilestoneMultiplier("coinsMult", state.level, state.rebirthTier);
  return treeMult * rebirthFlatMult * rebirthStatMult * milestoneMult;
}

export function getCoinSpawnIntervalMs(state: GameState): number {
  const base = 2000;
  const reduction = state.coinUpgrades.fasterSpawn.buys * 200;
  const treeFaster = state.purchasedTreeNodes.includes("r5_fasterSpawn");
  const interval = base - reduction;
  const adjusted = treeFaster ? interval / 2 : interval;
  return Math.max(500, Math.round(adjusted));
}

export function getCoinSpawnCap(state: GameState): number {
  return 10 + (state.purchasedTreeNodes.includes("r5_spawnCap") ? 10 : 0);
}

export function getCoinSpawnBulk(state: GameState): number {
  return 1 + (state.purchasedTreeNodes.includes("r5_spawnBulk") ? 1 : 0);
}

export function getReadingPointsPerSec(state: GameState): number {
  const readingUnlocked = state.purchasedTreeNodes.includes("r7_unlockReading");
  if (!readingUnlocked || state.reading.books === 0) return 0;
  const baseRP = state.reading.books;
  const upgMult = 1 + state.reading.upgrades.moreRP * 0.01;
  const treeMult = getTreeMultiplier(
    "readingPointsMult",
    state.purchasedTreeNodes
  );
  const rebirthMult = state.rebirthTier >= 2 ? 3 : 1;
  return baseRP * upgMult * treeMult * rebirthMult;
}

export function getBookCost(state: GameState): number {
  const cheaperBooks = state.purchasedTreeNodes.includes("r9_cheaperBooks");
  const scaleFactor = cheaperBooks ? 1.05 : 1.1;
  return Math.ceil(10000 * Math.pow(scaleFactor, state.reading.books));
}

export function getCurrencyAmount(state: GameState, currency: TreeCurrency): number {
  switch (currency) {
    case "points":
      return state.points;
    case "prestigePoints":
      return state.prestigePoints;
    case "coins":
      return state.coins;
    case "readingPoints":
      return state.reading.readingPoints;
  }
}

function deductCurrency(
  state: GameState,
  currency: TreeCurrency,
  amount: number
): GameState {
  switch (currency) {
    case "points":
      return { ...state, points: state.points - amount };
    case "prestigePoints":
      return { ...state, prestigePoints: state.prestigePoints - amount };
    case "coins":
      return { ...state, coins: state.coins - amount };
    case "readingPoints":
      return {
        ...state,
        reading: {
          ...state.reading,
          readingPoints: state.reading.readingPoints - amount,
        },
      };
  }
}

const initialDropUpgrades: GameState["dropUpgrades"] = {
  dropAmount: { id: "dropAmount", buys: 0, maxBuys: 100, baseCost: 10 },
  dropXP: { id: "dropXP", buys: 0, maxBuys: 100, baseCost: 50 },
  rapidDrop: { id: "rapidDrop", buys: 0, maxBuys: 4, baseCost: 100 },
};

const initialPrestigeUpgrades: GameState["prestigeUpgrades"] = {
  morePoints: { id: "morePoints", buys: 0, maxBuys: 10, baseCost: 1 },
  moreXP: { id: "moreXP", buys: 0, maxBuys: 10, baseCost: 2 },
  morePP: { id: "morePP", buys: 0, maxBuys: 10, baseCost: 10 },
};

const initialCoinUpgrades: GameState["coinUpgrades"] = {
  moreCash: { id: "moreCash", buys: 0, maxBuys: 10, baseCost: 5 },
  moreXP: { id: "moreXP", buys: 0, maxBuys: 10, baseCost: 5 },
  fasterSpawn: { id: "fasterSpawn", buys: 0, maxBuys: 4, baseCost: 15 },
};

const initialReading: GameState["reading"] = {
  books: 0,
  readingPoints: 0,
  upgrades: { morePoints: 0, moreXP: 0, moreRP: 0 },
};

const initialState: GameState = {
  points: 0,
  runPoints: 0,
  lifetimePoints: 0,
  totalDrops: 0,
  xp: 0,
  level: 1,
  prestigePoints: 0,
  rebirthCount: 0,
  rebirthTier: 0,
  dropUpgrades: initialDropUpgrades,
  prestigeUpgrades: initialPrestigeUpgrades,
  coins: 0,
  lifetimeCoins: 0,
  coinUpgrades: initialCoinUpgrades,
  purchasedTreeNodes: [],
  reading: initialReading,
  milestonesSeen: false,
  gold: 0,
  ownedGamepasses: [],
};

function applyDrop(
  state: GameState
): { newState: GameState; leveledUp: boolean } {
  const earned = getDropAmount(state);
  const xpEarned = getXPAmount(state);
  const newPoints = state.points + earned;
  const newRunPoints = state.runPoints + earned;
  const newLifetime = state.lifetimePoints + earned;
  let newXP = state.xp + xpEarned;
  let newLevel = state.level;
  let leveledUp = false;

  while (newXP >= xpForLevel(newLevel)) {
    newXP -= xpForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  return {
    newState: {
      ...state,
      points: newPoints,
      runPoints: newRunPoints,
      lifetimePoints: newLifetime,
      totalDrops: state.totalDrops + 1,
      xp: newXP,
      level: newLevel,
    },
    leveledUp,
  };
}

function reducer(
  state: GameState,
  action: Action
): { state: GameState; leveledUp: boolean } {
  switch (action.type) {
    case "DROP": {
      const { newState, leveledUp } = applyDrop(state);
      return { state: newState, leveledUp };
    }

    case "BUY_DROP_UPGRADE": {
      const upg = state.dropUpgrades[action.id];
      const effectiveMax = getEffectiveDropMaxBuys(upg, state.rebirthTier >= 2);
      if (upg.buys >= effectiveMax) return { state, leveledUp: false };
      const cost = dropUpgradeCost(upg);
      if (state.points < cost) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          points: state.points - cost,
          dropUpgrades: {
            ...state.dropUpgrades,
            [action.id]: { ...upg, buys: upg.buys + 1 },
          },
        },
        leveledUp: false,
      };
    }

    case "BUY_MAX_DROP_UPGRADE": {
      let upg = state.dropUpgrades[action.id];
      const effectiveMax = getEffectiveDropMaxBuys(upg, state.rebirthTier >= 2);
      let pts = state.points;
      let buys = upg.buys;
      while (buys < effectiveMax) {
        const cost = Math.ceil(upg.baseCost * Math.pow(DROP_COST_SCALE, buys));
        if (pts < cost) break;
        pts -= cost;
        buys++;
      }
      if (buys === upg.buys) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          points: pts,
          dropUpgrades: {
            ...state.dropUpgrades,
            [action.id]: { ...upg, buys },
          },
        },
        leveledUp: false,
      };
    }

    case "BUY_PRESTIGE_UPGRADE": {
      const upg = state.prestigeUpgrades[action.id];
      const effectiveMax = getEffectivePrestigeMaxBuys(
        upg.maxBuys
      );
      if (upg.buys >= effectiveMax) return { state, leveledUp: false };
      const cost = prestigeUpgradeCost(upg);
      if (state.prestigePoints < cost) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          prestigePoints: state.prestigePoints - cost,
          prestigeUpgrades: {
            ...state.prestigeUpgrades,
            [action.id]: { ...upg, buys: upg.buys + 1 },
          },
        },
        leveledUp: false,
      };
    }

    case "BUY_MAX_PRESTIGE_UPGRADE": {
      let upg = state.prestigeUpgrades[action.id];
      const effectiveMax = getEffectivePrestigeMaxBuys(
        upg.maxBuys
      );
      let pp = state.prestigePoints;
      let buys = upg.buys;
      while (buys < effectiveMax) {
        const cost = upg.baseCost * Math.pow(PRESTIGE_COST_SCALE, buys);
        if (pp < cost) break;
        pp -= cost;
        buys++;
      }
      if (buys === upg.buys) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          prestigePoints: pp,
          prestigeUpgrades: {
            ...state.prestigeUpgrades,
            [action.id]: { ...upg, buys },
          },
        },
        leveledUp: false,
      };
    }

    case "COLLECT_COIN": {
      const mult = getCoinValueMultiplier(state);
      const total = Math.round(action.value * mult);
      return {
        state: {
          ...state,
          coins: state.coins + total,
          lifetimeCoins: state.lifetimeCoins + total,
        },
        leveledUp: false,
      };
    }

    case "BUY_COIN_UPGRADE": {
      const upg = state.coinUpgrades[action.id];
      if (upg.buys >= upg.maxBuys) return { state, leveledUp: false };
      const cost = coinUpgradeCost(upg);
      if (state.coins < cost) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          coins: state.coins - cost,
          coinUpgrades: {
            ...state.coinUpgrades,
            [action.id]: { ...upg, buys: upg.buys + 1 },
          },
        },
        leveledUp: false,
      };
    }

    case "BUY_MAX_COIN_UPGRADE": {
      let upg = state.coinUpgrades[action.id];
      let coins = state.coins;
      let buys = upg.buys;
      const scale = upg.id === "fasterSpawn" ? 3 : 5;
      while (buys < upg.maxBuys) {
        const cost = Math.ceil(upg.baseCost * Math.pow(scale, buys));
        if (coins < cost) break;
        coins -= cost;
        buys++;
      }
      if (buys === upg.buys) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          coins: coins,
          coinUpgrades: {
            ...state.coinUpgrades,
            [action.id]: { ...upg, buys },
          },
        },
        leveledUp: false,
      };
    }

    case "BUY_TREE_NODE": {
      const node = UPGRADE_TREE.find((n) => n.id === action.nodeId);
      if (!node) return { state, leveledUp: false };
      if (state.purchasedTreeNodes.includes(node.id))
        return { state, leveledUp: false };
      if (
        !isNodeAvailable(
          node,
          state.purchasedTreeNodes,
          state.rebirthTier,
          state.level
        )
      )
        return { state, leveledUp: false };
      const currentAmount = getCurrencyAmount(state, node.currency);
      if (currentAmount < node.cost) return { state, leveledUp: false };
      const deducted = deductCurrency(state, node.currency, node.cost);
      return {
        state: {
          ...deducted,
          purchasedTreeNodes: [...state.purchasedTreeNodes, node.id],
        },
        leveledUp: false,
      };
    }

    case "BUY_BOOK": {
      const cost = getBookCost(state);
      if (state.coins < cost) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          coins: state.coins - cost,
          reading: {
            ...state.reading,
            books: state.reading.books + 1,
          },
        },
        leveledUp: false,
      };
    }

    case "INVEST_READING": {
      const { category, amount: rawAmount } = action;
      if (rawAmount <= 0) return { state, leveledUp: false };
      if (state.reading.readingPoints < rawAmount)
        return { state, leveledUp: false };
      const cap = getReadingUpgradesCap(state.level, state.rebirthTier);
      let amount = rawAmount;
      if (cap !== null) {
        // Cap is the max multiplier (e.g. 250x). Convert to max upgrade level.
        const maxLevel = (cap - 1) / 0.01;
        const current = state.reading.upgrades[category];
        const room = maxLevel - current;
        if (room <= 0) return { state, leveledUp: false };
        // Clamp RP spent so upgrade level doesn't exceed max
        const maxRP = room / 0.1;
        amount = Math.min(amount, maxRP);
      }
      return {
        state: {
          ...state,
          reading: {
            ...state.reading,
            readingPoints: state.reading.readingPoints - amount,
            upgrades: {
              ...state.reading.upgrades,
              [category]: state.reading.upgrades[category] + amount * 0.1,
            },
          },
        },
        leveledUp: false,
      };
    }

    case "TICK_READING": {
      const rpPerSec = getReadingPointsPerSec(state);
      if (rpPerSec <= 0) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          reading: {
            ...state.reading,
            readingPoints: state.reading.readingPoints + rpPerSec,
          },
        },
        leveledUp: false,
      };
    }

    case "TICK_PASSIVE_PP": {
      if (state.rebirthTier < 3) return { state, leveledUp: false };
      if (state.prestigePoints <= 0) return { state, leveledUp: false };
      const ppRate = isPPFullPercentUnlocked(state.level, state.rebirthTier) ? 1.0 : 0.1;
      const rawPPGain = Math.floor(state.prestigePoints * ppRate);
      const ppMilestoneMult = getMilestoneMultiplier("prestigePointsMult", state.level, state.rebirthTier);
      const ppGain = Math.min(Math.floor(rawPPGain * ppMilestoneMult), state.level * 100);
      if (ppGain <= 0) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          prestigePoints: state.prestigePoints + ppGain,
        },
        leveledUp: false,
      };
    }

    case "AUTO_BUY_DROP_UPGRADE": {
      if (state.rebirthTier < 3) return { state, leveledUp: false };
      const tier2 = state.rebirthTier >= 2;
      const candidates = (["dropAmount", "dropXP"] as const).filter((id) => {
        const u = state.dropUpgrades[id];
        return u.buys < getEffectiveDropMaxBuys(u, tier2);
      });
      if (candidates.length === 0) return { state, leveledUp: false };
      const id = candidates.reduce((a, b) =>
        dropUpgradeCost(state.dropUpgrades[a]) <=
        dropUpgradeCost(state.dropUpgrades[b])
          ? a
          : b
      );
      const upg = state.dropUpgrades[id];
      return {
        state: {
          ...state,
          dropUpgrades: {
            ...state.dropUpgrades,
            [id]: { ...upg, buys: upg.buys + 1 },
          },
        },
        leveledUp: false,
      };
    }

    case "AUTO_BUY_PRESTIGE_UPGRADE": {
      if (state.rebirthTier < 3) return { state, leveledUp: false };
      const pCandidates = (["morePoints", "moreXP", "morePP"] as const).filter(
        (id) => {
          const u = state.prestigeUpgrades[id];
          return u.buys < getEffectivePrestigeMaxBuys(u.maxBuys);
        }
      );
      if (pCandidates.length === 0) return { state, leveledUp: false };
      const pId = pCandidates.reduce((a, b) =>
        prestigeUpgradeCost(state.prestigeUpgrades[a]) <=
        prestigeUpgradeCost(state.prestigeUpgrades[b])
          ? a
          : b
      );
      const pUpg = state.prestigeUpgrades[pId];
      return {
        state: {
          ...state,
          prestigeUpgrades: {
            ...state.prestigeUpgrades,
            [pId]: { ...pUpg, buys: pUpg.buys + 1 },
          },
        },
        leveledUp: false,
      };
    }

    case "AUTO_BUY_BOOK": {
      if (state.rebirthTier < 4) return { state, leveledUp: false };
      if (!state.purchasedTreeNodes.includes("r7_unlockReading"))
        return { state, leveledUp: false };
      const cost = getBookCost(state);
      if (state.coins < cost) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          coins: state.coins - cost,
          reading: {
            ...state.reading,
            books: state.reading.books + 1,
          },
        },
        leveledUp: false,
      };
    }

    case "AUTO_INVEST_READING": {
      if (state.rebirthTier < 4) return { state, leveledUp: false };
      const rp = Math.floor(state.reading.readingPoints);
      if (rp < 3) return { state, leveledUp: false };
      const perCategory = Math.floor(rp / 3) * 0.1;
      const autoCap = getReadingUpgradesCap(state.level, state.rebirthTier);
      // Cap is max multiplier; convert to max upgrade level
      const maxLevel = autoCap !== null ? (autoCap - 1) / 0.01 : Infinity;
      const targetLevel = Math.min(perCategory, maxLevel);
      // SET levels (not additive), don't spend RP
      if (
        targetLevel === state.reading.upgrades.morePoints &&
        targetLevel === state.reading.upgrades.moreXP &&
        targetLevel === state.reading.upgrades.moreRP
      ) {
        return { state, leveledUp: false };
      }
      return {
        state: {
          ...state,
          reading: {
            ...state.reading,
            upgrades: {
              morePoints: targetLevel,
              moreXP: targetLevel,
              moreRP: targetLevel,
            },
          },
        },
        leveledUp: false,
      };
    }

    case "AUTO_BUY_COIN_UPGRADE": {
      if (state.rebirthTier < 5) return { state, leveledUp: false };
      const cCandidates = (
        ["moreCash", "moreXP", "fasterSpawn"] as const
      ).filter((id) => {
        const u = state.coinUpgrades[id];
        return u.buys < u.maxBuys;
      });
      if (cCandidates.length === 0) return { state, leveledUp: false };
      const cId = cCandidates.reduce((a, b) =>
        coinUpgradeCost(state.coinUpgrades[a]) <=
        coinUpgradeCost(state.coinUpgrades[b])
          ? a
          : b
      );
      const cUpg = state.coinUpgrades[cId];
      return {
        state: {
          ...state,
          coinUpgrades: {
            ...state.coinUpgrades,
            [cId]: { ...cUpg, buys: cUpg.buys + 1 },
          },
        },
        leveledUp: false,
      };
    }

    case "PRESTIGE": {
      if (state.points < 1000) return { state, leveledUp: false };
      const ppGain = calcPrestigePoints(state.points);
      const ppMult =
        Math.pow(2, state.prestigeUpgrades.morePP.buys) *
        (state.rebirthTier >= 1 ? Math.pow(2, state.rebirthCount) : 1);
      const ppMilestoneMult = getMilestoneMultiplier("prestigePointsMult", state.level, state.rebirthTier);
      const totalPP = Math.floor(ppGain * ppMult * ppMilestoneMult);

      if (state.rebirthTier >= 2) {
        return {
          state: {
            ...state,
            points: 0,
            runPoints: 0,
            totalDrops: 0,
            xp: 0,
            level: 1,
            prestigePoints: state.prestigePoints + totalPP,
          },
          leveledUp: false,
        };
      }

      return {
        state: {
          ...state,
          points: 0,
          runPoints: 0,
          totalDrops: 0,
          xp: 0,
          level: 1,
          prestigePoints: state.prestigePoints + totalPP,
          dropUpgrades: { ...initialDropUpgrades },
        },
        leveledUp: false,
      };
    }

    case "REBIRTH": {
      const { which } = action;
      const threshold = REBIRTH_THRESHOLDS[which];
      if (state.points < threshold) return { state, leveledUp: false };
      if (state.level < REBIRTH_MIN_LEVEL) return { state, leveledUp: false };
      if (which > 1 && state.rebirthTier < which - 1)
        return { state, leveledUp: false };

      return {
        state: {
          ...initialState,
          rebirthCount: state.rebirthCount + 1,
          rebirthTier: Math.max(state.rebirthTier, which),
          lifetimePoints: state.lifetimePoints,
          lifetimeCoins: state.lifetimeCoins,
          milestonesSeen: state.milestonesSeen,
          gold: state.gold,
          ownedGamepasses: state.ownedGamepasses,
        },
        leveledUp: false,
      };
    }

    case "SET_MILESTONES_SEEN": {
      return {
        state: { ...state, milestonesSeen: true },
        leveledUp: false,
      };
    }

    case "BUY_GAMEPASS": {
      const pass = GAMEPASSES.find((g) => g.id === action.id);
      if (!pass) return { state, leveledUp: false };
      if (state.ownedGamepasses.includes(action.id))
        return { state, leveledUp: false };
      if (state.gold < pass.goldCost) return { state, leveledUp: false };
      return {
        state: {
          ...state,
          gold: state.gold - pass.goldCost,
          ownedGamepasses: [...state.ownedGamepasses, action.id],
        },
        leveledUp: false,
      };
    }

    case "RESET_GAME": {
      return { state: initialState, leveledUp: false };
    }

    case "LOAD": {
      interface LegacyPerks {
        autoBuyUpgrades?: boolean;
        bonusMult?: boolean;
        autoBuyPrestigeUpgrades?: boolean;
        tripleMult?: boolean;
        diamondsUnlocked?: boolean;
      }
      interface LegacyDropUpgrades {
        dropAmount?: Partial<DropUpgrade>;
        dropXP?: Partial<DropUpgrade>;
        rapidDrop?: Partial<DropUpgrade>;
        dropTimer?: Partial<DropUpgrade>;
      }
      interface LegacyCoinUpgrades {
        moreCash?: Partial<CoinUpgrade>;
        moreXP?: Partial<CoinUpgrade>;
        fasterSpawn?: Partial<CoinUpgrade>;
        pointSurge?: Partial<CoinUpgrade>;
        xpSurge?: Partial<CoinUpgrade>;
        coinRush?: Partial<CoinUpgrade>;
      }
      type LegacyState = Partial<GameState> & {
        rebirthPerks?: LegacyPerks;
        dropUpgrades?: LegacyDropUpgrades;
        coinUpgrades?: LegacyCoinUpgrades;
      };
      const s: LegacyState = action.state as LegacyState;

      let rebirthTier = s.rebirthTier ?? 0;
      if (rebirthTier === 0 && s.rebirthPerks) {
        const rp = s.rebirthPerks;
        if (rp.diamondsUnlocked) rebirthTier = 5;
        else if (rp.tripleMult) rebirthTier = 4;
        else if (rp.autoBuyPrestigeUpgrades) rebirthTier = 3;
        else if (rp.bonusMult) rebirthTier = 2;
        else if (rp.autoBuyUpgrades) rebirthTier = 1;
      }

      const loadedDrop: LegacyDropUpgrades = s.dropUpgrades ?? {};
      const mergedDrop: GameState["dropUpgrades"] = {
        dropAmount: {
          ...initialDropUpgrades.dropAmount,
          ...(loadedDrop.dropAmount ?? {}),
        },
        dropXP: {
          ...initialDropUpgrades.dropXP,
          ...(loadedDrop.dropXP ?? {}),
        },
        rapidDrop: {
          ...initialDropUpgrades.rapidDrop,
          ...(loadedDrop.rapidDrop ?? loadedDrop.dropTimer ?? {}),
          id: "rapidDrop",
          maxBuys: initialDropUpgrades.rapidDrop.maxBuys,
          buys: Math.min(
            (loadedDrop.rapidDrop ?? loadedDrop.dropTimer ?? {}).buys ?? 0,
            initialDropUpgrades.rapidDrop.maxBuys
          ),
        },
      };

      const tier2Active = rebirthTier >= 2;

      const loadedPrestige: Partial<GameState["prestigeUpgrades"]> =
        s.prestigeUpgrades ?? {};
      const mergedPrestige: GameState["prestigeUpgrades"] = {
        morePoints: {
          ...initialPrestigeUpgrades.morePoints,
          ...(loadedPrestige.morePoints ?? {}),
          maxBuys: initialPrestigeUpgrades.morePoints.maxBuys,
          buys: Math.min(
            loadedPrestige.morePoints?.buys ?? 0,
            getEffectivePrestigeMaxBuys(initialPrestigeUpgrades.morePoints.maxBuys)
          ),
        },
        moreXP: {
          ...initialPrestigeUpgrades.moreXP,
          ...(loadedPrestige.moreXP ?? {}),
          maxBuys: initialPrestigeUpgrades.moreXP.maxBuys,
          buys: Math.min(
            loadedPrestige.moreXP?.buys ?? 0,
            getEffectivePrestigeMaxBuys(initialPrestigeUpgrades.moreXP.maxBuys)
          ),
        },
        morePP: {
          ...initialPrestigeUpgrades.morePP,
          ...(loadedPrestige.morePP ?? {}),
          maxBuys: initialPrestigeUpgrades.morePP.maxBuys,
          buys: Math.min(
            loadedPrestige.morePP?.buys ?? 0,
            getEffectivePrestigeMaxBuys(initialPrestigeUpgrades.morePP.maxBuys)
          ),
        },
      };

      const loadedCoinUpg: LegacyCoinUpgrades = s.coinUpgrades ?? {};
      const oldPointSurge = loadedCoinUpg.pointSurge ?? loadedCoinUpg.moreCash;
      const oldXpSurge = loadedCoinUpg.xpSurge ?? loadedCoinUpg.moreXP;
      const oldCoinRush = loadedCoinUpg.coinRush ?? loadedCoinUpg.fasterSpawn;
      const mergedCoinUpg: GameState["coinUpgrades"] = {
        moreCash: {
          ...initialCoinUpgrades.moreCash,
          buys: Math.min(
            oldPointSurge?.buys ?? 0,
            initialCoinUpgrades.moreCash.maxBuys
          ),
        },
        moreXP: {
          ...initialCoinUpgrades.moreXP,
          buys: Math.min(
            oldXpSurge?.buys ?? 0,
            initialCoinUpgrades.moreXP.maxBuys
          ),
        },
        fasterSpawn: {
          ...initialCoinUpgrades.fasterSpawn,
          buys: Math.min(
            oldCoinRush?.buys ?? 0,
            initialCoinUpgrades.fasterSpawn.maxBuys
          ),
        },
      };

      const loadedReading: Partial<GameState["reading"]> = s.reading ?? {};
      const mergedReading: GameState["reading"] = {
        books: loadedReading.books ?? 0,
        readingPoints: loadedReading.readingPoints ?? 0,
        upgrades: {
          ...initialReading.upgrades,
          ...(loadedReading.upgrades ?? {}),
        },
      };

      return {
        state: {
          ...initialState,
          points: s.points ?? 0,
          runPoints: s.runPoints ?? 0,
          lifetimePoints: s.lifetimePoints ?? s.runPoints ?? 0,
          totalDrops: s.totalDrops ?? 0,
          xp: s.xp ?? 0,
          level: s.level ?? 1,
          prestigePoints: s.prestigePoints ?? 0,
          rebirthCount: s.rebirthCount ?? 0,
          rebirthTier,
          dropUpgrades: mergedDrop,
          prestigeUpgrades: mergedPrestige,
          coins: s.coins ?? 0,
          lifetimeCoins: s.lifetimeCoins ?? 0,
          coinUpgrades: mergedCoinUpg,
          purchasedTreeNodes: s.purchasedTreeNodes ?? [],
          reading: mergedReading,
          milestonesSeen: s.milestonesSeen ?? false,
          gold: s.gold ?? 0,
          ownedGamepasses: s.ownedGamepasses ?? [],
        },
        leveledUp: false,
      };
    }

    default:
      return { state, leveledUp: false };
  }
}

function wrappedReducer(
  combined: { state: GameState; leveledUp: boolean },
  action: Action
): { state: GameState; leveledUp: boolean } {
  return reducer(combined.state, action);
}

interface GameContextValue {
  state: GameState;
  drop: () => void;
  buyDropUpgrade: (id: DropUpgrade["id"]) => void;
  buyMaxDropUpgrade: (id: DropUpgrade["id"]) => void;
  buyPrestigeUpgrade: (id: PrestigeUpgrade["id"]) => void;
  buyMaxPrestigeUpgrade: (id: PrestigeUpgrade["id"]) => void;
  collectCoin: (value: number) => void;
  buyCoinUpgrade: (id: CoinUpgrade["id"]) => void;
  buyMaxCoinUpgrade: (id: CoinUpgrade["id"]) => void;
  buyTreeNode: (nodeId: string) => void;
  buyBook: () => void;
  investReading: (category: ReadingUpgradeId, amount: number) => void;
  prestige: () => void;
  rebirth: (which: 1 | 2 | 3 | 4 | 5) => void;
  dropAmount: number;
  xpAmount: number;
  clickCooldownMs: number;
  xpProgress: number;
  xpRequired: number;
  levelPointsMult: number;
  levelXPMult: number;
  coinSpawnIntervalMs: number;
  coinSpawnCap: number;
  coinSpawnBulk: number;
  readingPointsPerSec: number;
  bookCost: number;
  readingUnlocked: boolean;
  canPrestige: boolean;
  canRebirth1: boolean;
  canRebirth2: boolean;
  canRebirth3: boolean;
  canRebirth4: boolean;
  canRebirth5: boolean;
  bonusesUnlocked: boolean;
  treeUnlocked: boolean;
  showRebirthSection: boolean;
  leveledUp: boolean;
  cloudSyncStatus: CloudSyncStatus;
  effectiveDropMax: (id: DropUpgrade["id"]) => number;
  effectivePrestigeMax: (id: PrestigeUpgrade["id"]) => number;
  milestonesUnlocked: boolean;
  setMilestonesSeen: () => void;
  readingUpgradesCap: number | null;
  buyGamepass: (id: GamepassId) => void;
  hasGamepass: (id: string) => boolean;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);
const STORAGE_KEY = "dropper_game_v3";
const CLOUD_SYNC_INTERVAL = 10_000;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [combined, dispatch] = useReducer(wrappedReducer, {
    state: initialState,
    leveledUp: false,
  });

  const { state } = combined;
  const { isAuthenticated } = useAuth();
  const [cloudSyncStatus, setCloudSyncStatus] =
    useState<CloudSyncStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoClickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoT3Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoT4Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoT5Ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localLoaded, setLocalLoaded] = useState(false);
  const cloudSyncedRef = useRef(false);
  const pendingCloudSaveRef = useRef(false);
  const lastCloudSaveRef = useRef<number>(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const loaded = JSON.parse(raw) as GameState;
          dispatch({ type: "LOAD", state: loaded });
        } catch {}
      }
      setLocalLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const doCloudSave = useCallback(async () => {
    if (!isAuthenticated) return;
    const currentState = stateRef.current;
    if (currentState.lifetimePoints === 0 && currentState.totalDrops === 0)
      return;

    setCloudSyncStatus("syncing");
    const result = await pushCloudSave(currentState);
    if (result) {
      setCloudSyncStatus("saved");
      lastCloudSaveRef.current = Date.now();
      pendingCloudSaveRef.current = false;
      setTimeout(() => {
        setCloudSyncStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 3000);
    } else {
      setCloudSyncStatus("offline");
      pendingCloudSaveRef.current = true;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !localLoaded) return;
    if (cloudSyncedRef.current) return;
    cloudSyncedRef.current = true;

    (async () => {
      setCloudSyncStatus("syncing");
      const result = await fetchCloudSave();

      if (result.status === "error") {
        setCloudSyncStatus("offline");
        pendingCloudSaveRef.current = true;
        cloudSyncedRef.current = false;
        return;
      }

      if (result.status === "empty") {
        setCloudSyncStatus("idle");
        if (
          stateRef.current.lifetimePoints > 0 ||
          stateRef.current.totalDrops > 0
        ) {
          doCloudSave();
        }
        return;
      }

      const localLP = stateRef.current.lifetimePoints ?? 0;
      const cloudLP = (result.gameState.lifetimePoints as number) ?? 0;

      if (cloudLP > localLP) {
        dispatch({ type: "LOAD", state: result.gameState });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.gameState));
        setCloudSyncStatus("saved");
        setTimeout(() => {
          setCloudSyncStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 3000);
      } else if (localLP > cloudLP) {
        doCloudSave();
      } else {
        setCloudSyncStatus("idle");
      }
    })();
  }, [isAuthenticated, localLoaded, doCloudSave]);

  useEffect(() => {
    if (!isAuthenticated) {
      cloudSyncedRef.current = false;
      return;
    }

    cloudSaveTimerRef.current = setInterval(async () => {
      if (!cloudSyncedRef.current) {
        const retryResult = await fetchCloudSave();
        if (retryResult.status === "error") {
          setCloudSyncStatus("offline");
          return;
        }
        cloudSyncedRef.current = true;
        if (retryResult.status === "found") {
          const localLP = stateRef.current.lifetimePoints ?? 0;
          const cloudLP =
            (retryResult.gameState.lifetimePoints as number) ?? 0;
          if (cloudLP > localLP) {
            dispatch({ type: "LOAD", state: retryResult.gameState });
            AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(retryResult.gameState)
            );
            setCloudSyncStatus("saved");
            setTimeout(() => {
              setCloudSyncStatus((prev) =>
                prev === "saved" ? "idle" : prev
              );
            }, 3000);
            return;
          }
        }
        doCloudSave();
        return;
      }

      if (
        pendingCloudSaveRef.current ||
        Date.now() - lastCloudSaveRef.current >= CLOUD_SYNC_INTERVAL
      ) {
        doCloudSave();
      }
    }, CLOUD_SYNC_INTERVAL);

    return () => {
      if (cloudSaveTimerRef.current) clearInterval(cloudSaveTimerRef.current);
    };
  }, [isAuthenticated, doCloudSave]);

  useEffect(() => {
    if (!isAuthenticated) return;
    pendingCloudSaveRef.current = true;
  }, [state, isAuthenticated]);

  useEffect(() => {
    const flushSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
    };

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        flushSave();
        if (isAuthenticated) {
          doCloudSave();
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => {
      sub.remove();
      flushSave();
    };
  }, [isAuthenticated, doCloudSave]);

  useEffect(() => {
    if (readingTickRef.current) clearInterval(readingTickRef.current);
    readingTickRef.current = setInterval(() => {
      dispatch({ type: "TICK_READING" });
    }, 1000);
    return () => {
      if (readingTickRef.current) clearInterval(readingTickRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoClickRef.current) clearInterval(autoClickRef.current);
    if (state.rebirthTier >= 1 || state.ownedGamepasses.includes("opAutoDropper")) {
      const interval = state.ownedGamepasses.includes("opAutoDropper") ? 100 : 500;
      autoClickRef.current = setInterval(() => {
        dispatch({ type: "DROP" });
      }, interval);
    }
    return () => {
      if (autoClickRef.current) clearInterval(autoClickRef.current);
    };
  }, [state.rebirthTier, state.ownedGamepasses]);

  useEffect(() => {
    if (autoT3Ref.current) clearInterval(autoT3Ref.current);
    if (state.rebirthTier >= 3) {
      autoT3Ref.current = setInterval(() => {
        dispatch({ type: "AUTO_BUY_DROP_UPGRADE" });
        dispatch({ type: "AUTO_BUY_PRESTIGE_UPGRADE" });
        dispatch({ type: "TICK_PASSIVE_PP" });
      }, 1000);
    }
    return () => {
      if (autoT3Ref.current) clearInterval(autoT3Ref.current);
    };
  }, [state.rebirthTier]);

  useEffect(() => {
    if (autoT4Ref.current) clearInterval(autoT4Ref.current);
    if (state.rebirthTier >= 4) {
      autoT4Ref.current = setInterval(() => {
        dispatch({ type: "AUTO_INVEST_READING" });
        dispatch({ type: "AUTO_BUY_BOOK" });
      }, 1000);
    }
    return () => {
      if (autoT4Ref.current) clearInterval(autoT4Ref.current);
    };
  }, [state.rebirthTier]);

  useEffect(() => {
    if (autoT5Ref.current) clearInterval(autoT5Ref.current);
    if (state.rebirthTier >= 5) {
      autoT5Ref.current = setInterval(() => {
        dispatch({ type: "AUTO_BUY_COIN_UPGRADE" });
      }, 1000);
    }
    return () => {
      if (autoT5Ref.current) clearInterval(autoT5Ref.current);
    };
  }, [state.rebirthTier]);

  const drop = useCallback(() => dispatch({ type: "DROP" }), []);
  const buyDropUpgrade = useCallback(
    (id: DropUpgrade["id"]) => dispatch({ type: "BUY_DROP_UPGRADE", id }),
    []
  );
  const buyMaxDropUpgrade = useCallback(
    (id: DropUpgrade["id"]) => dispatch({ type: "BUY_MAX_DROP_UPGRADE", id }),
    []
  );
  const buyPrestigeUpgrade = useCallback(
    (id: PrestigeUpgrade["id"]) =>
      dispatch({ type: "BUY_PRESTIGE_UPGRADE", id }),
    []
  );
  const buyMaxPrestigeUpgrade = useCallback(
    (id: PrestigeUpgrade["id"]) =>
      dispatch({ type: "BUY_MAX_PRESTIGE_UPGRADE", id }),
    []
  );
  const collectCoin = useCallback(
    (value: number) => dispatch({ type: "COLLECT_COIN", value }),
    []
  );
  const buyCoinUpgrade = useCallback(
    (id: CoinUpgrade["id"]) => dispatch({ type: "BUY_COIN_UPGRADE", id }),
    []
  );
  const buyMaxCoinUpgrade = useCallback(
    (id: CoinUpgrade["id"]) => dispatch({ type: "BUY_MAX_COIN_UPGRADE", id }),
    []
  );
  const buyTreeNode = useCallback(
    (nodeId: string) => dispatch({ type: "BUY_TREE_NODE", nodeId }),
    []
  );
  const buyBook = useCallback(() => dispatch({ type: "BUY_BOOK" }), []);
  const investReading = useCallback(
    (category: ReadingUpgradeId, amount: number) =>
      dispatch({ type: "INVEST_READING", category, amount }),
    []
  );
  const prestige = useCallback(() => dispatch({ type: "PRESTIGE" }), []);
  const rebirth = useCallback(
    (which: 1 | 2 | 3 | 4 | 5) => dispatch({ type: "REBIRTH", which }),
    []
  );
  const buyGamepass = useCallback(
    (id: GamepassId) => dispatch({ type: "BUY_GAMEPASS", id }),
    []
  );
  const hasGamepass = useCallback(
    (id: string) => state.ownedGamepasses.includes(id),
    [state.ownedGamepasses]
  );
  const resetGame = useCallback(() => {
    dispatch({ type: "RESET_GAME" });
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const dropAmount = useMemo(() => getDropAmount(state), [state]);
  const xpAmount = useMemo(() => getXPAmount(state), [state]);
  const clickCooldownMs = useMemo(() => getClickCooldownMs(state), [state]);
  const xpRequired = useMemo(() => xpForLevel(state.level), [state.level]);
  const levelPointsMult = useMemo(
    () => getLevelPointsMult(state.level),
    [state.level]
  );
  const levelXPMult = useMemo(
    () => getLevelXPMult(state.level),
    [state.level]
  );
  const coinSpawnIntervalMs = useMemo(
    () => getCoinSpawnIntervalMs(state),
    [state]
  );
  const coinSpawnCap = useMemo(() => getCoinSpawnCap(state), [state]);
  const coinSpawnBulk = useMemo(() => getCoinSpawnBulk(state), [state]);
  const readingPointsPerSecVal = useMemo(
    () => getReadingPointsPerSec(state),
    [state]
  );
  const bookCostVal = useMemo(() => getBookCost(state), [state]);
  const xpProgress = state.xp / xpRequired;
  const canPrestige = state.points >= 1000;
  const canRebirth1 =
    state.points >= REBIRTH_THRESHOLDS[1] && state.level >= REBIRTH_MIN_LEVEL;
  const canRebirth2 =
    state.points >= REBIRTH_THRESHOLDS[2] &&
    state.level >= REBIRTH_MIN_LEVEL &&
    state.rebirthTier >= 1;
  const canRebirth3 =
    state.points >= REBIRTH_THRESHOLDS[3] &&
    state.level >= REBIRTH_MIN_LEVEL &&
    state.rebirthTier >= 2;
  const canRebirth4 =
    state.points >= REBIRTH_THRESHOLDS[4] &&
    state.level >= REBIRTH_MIN_LEVEL &&
    state.rebirthTier >= 3;
  const canRebirth5 =
    state.points >= REBIRTH_THRESHOLDS[5] &&
    state.level >= REBIRTH_MIN_LEVEL &&
    state.rebirthTier >= 4;
  const bonusesUnlocked = state.level >= 8;
  const treeUnlocked = state.level >= 7;
  const readingUnlocked = state.purchasedTreeNodes.includes(
    "r7_unlockReading"
  );
  const showRebirthSection =
    state.level >= REBIRTH_MIN_LEVEL || state.rebirthCount > 0;
  const milestonesUnlocked = state.rebirthTier >= 5;
  const setMilestonesSeen = useCallback(
    () => dispatch({ type: "SET_MILESTONES_SEEN" }),
    []
  );
  const readingUpgradesCap = useMemo(
    () => getReadingUpgradesCap(state.level, state.rebirthTier),
    [state.level, state.rebirthTier]
  );

  const effectiveDropMax = useCallback(
    (id: DropUpgrade["id"]) =>
      getEffectiveDropMaxBuys(state.dropUpgrades[id], state.rebirthTier >= 2),
    [state.dropUpgrades, state.rebirthTier]
  );

  const effectivePrestigeMax = useCallback(
    (id: PrestigeUpgrade["id"]) =>
      getEffectivePrestigeMaxBuys(
        state.prestigeUpgrades[id].maxBuys
      ),
    [state.prestigeUpgrades]
  );

  const value = useMemo(
    () => ({
      state,
      drop,
      buyDropUpgrade,
      buyMaxDropUpgrade,
      buyPrestigeUpgrade,
      buyMaxPrestigeUpgrade,
      collectCoin,
      buyCoinUpgrade,
      buyMaxCoinUpgrade,
      buyTreeNode,
      buyBook,
      investReading,
      prestige,
      rebirth,
      dropAmount,
      xpAmount,
      clickCooldownMs,
      xpProgress,
      xpRequired,
      levelPointsMult,
      levelXPMult,
      coinSpawnIntervalMs,
      coinSpawnCap,
      coinSpawnBulk,
      readingPointsPerSec: readingPointsPerSecVal,
      bookCost: bookCostVal,
      readingUnlocked,
      canPrestige,
      canRebirth1,
      canRebirth2,
      canRebirth3,
      canRebirth4,
      canRebirth5,
      bonusesUnlocked,
      treeUnlocked,
      showRebirthSection,
      leveledUp: combined.leveledUp,
      cloudSyncStatus,
      effectiveDropMax,
      effectivePrestigeMax,
      milestonesUnlocked,
      setMilestonesSeen,
      readingUpgradesCap,
      buyGamepass,
      hasGamepass,
      resetGame,
    }),
    [
      state,
      drop,
      buyDropUpgrade,
      buyMaxDropUpgrade,
      buyPrestigeUpgrade,
      buyMaxPrestigeUpgrade,
      collectCoin,
      buyCoinUpgrade,
      buyMaxCoinUpgrade,
      buyTreeNode,
      buyBook,
      investReading,
      prestige,
      rebirth,
      dropAmount,
      xpAmount,
      clickCooldownMs,
      xpProgress,
      xpRequired,
      levelPointsMult,
      levelXPMult,
      coinSpawnIntervalMs,
      coinSpawnCap,
      coinSpawnBulk,
      readingPointsPerSecVal,
      bookCostVal,
      readingUnlocked,
      canPrestige,
      canRebirth1,
      canRebirth2,
      canRebirth3,
      canRebirth4,
      canRebirth5,
      bonusesUnlocked,
      treeUnlocked,
      showRebirthSection,
      combined.leveledUp,
      cloudSyncStatus,
      effectiveDropMax,
      effectivePrestigeMax,
      milestonesUnlocked,
      setMilestonesSeen,
      readingUpgradesCap,
      buyGamepass,
      hasGamepass,
      resetGame,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
