import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

export interface DropUpgrade {
  id: "dropAmount" | "dropXP" | "dropTimer";
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

export interface GameState {
  points: number;
  runPoints: number;
  lifetimePoints: number;
  totalDrops: number;
  xp: number;
  level: number;
  prestigePoints: number;
  rebirthCount: number;
  rebirthPerks: {
    autoBuyUpgrades: boolean;
    bonusMult: boolean;
  };
  dropUpgrades: {
    dropAmount: DropUpgrade;
    dropXP: DropUpgrade;
    dropTimer: DropUpgrade;
  };
  prestigeUpgrades: {
    morePoints: PrestigeUpgrade;
    moreXP: PrestigeUpgrade;
    morePP: PrestigeUpgrade;
  };
}

type Action =
  | { type: "DROP" }
  | { type: "BUY_DROP_UPGRADE"; id: DropUpgrade["id"] }
  | { type: "BUY_PRESTIGE_UPGRADE"; id: PrestigeUpgrade["id"] }
  | { type: "PRESTIGE" }
  | { type: "REBIRTH"; which: 1 | 2 }
  | { type: "LOAD"; state: GameState };

const XP_BASE = 100;
const XP_SCALE = 3.5;
const DROP_COST_SCALE = 1.14;
const PRESTIGE_COST_SCALE = 1.5;

export function xpForLevel(level: number): number {
  return XP_BASE * Math.pow(XP_SCALE, level - 1);
}

export function dropUpgradeCost(upgrade: DropUpgrade): number {
  return Math.ceil(upgrade.baseCost * Math.pow(DROP_COST_SCALE, upgrade.buys));
}

export function prestigeUpgradeCost(upgrade: PrestigeUpgrade): number {
  return upgrade.baseCost * Math.pow(PRESTIGE_COST_SCALE, upgrade.buys);
}

export function calcPrestigePoints(lifetimePoints: number): number {
  return Math.pow(lifetimePoints / 1_000_000, 0.43);
}

function getDropAmount(state: GameState): number {
  const baseAmount = 1 + state.dropUpgrades.dropAmount.buys;
  const prestigeMult = Math.pow(2, state.prestigeUpgrades.morePoints.buys);
  const rebirthMult = state.rebirthPerks.bonusMult ? 3 : 1;
  return baseAmount * prestigeMult * rebirthMult;
}

function getXPAmount(state: GameState): number {
  const baseXP = 1 * Math.pow(1.5, state.dropUpgrades.dropXP.buys);
  const prestigeMult = Math.pow(2, state.prestigeUpgrades.moreXP.buys);
  const rebirthMult = state.rebirthPerks.bonusMult ? 2 : 1;
  return baseXP * prestigeMult * rebirthMult;
}

function getDropTimer(state: GameState): number {
  const reduction = state.dropUpgrades.dropTimer.buys * 0.5;
  return Math.max(0.1, 2.0 - reduction);
}

export function getDropTimerMs(state: GameState): number {
  return Math.round(getDropTimer(state) * 1000);
}

const initialDropUpgrades: GameState["dropUpgrades"] = {
  dropAmount: { id: "dropAmount", buys: 0, maxBuys: 100, baseCost: 10 },
  dropXP: { id: "dropXP", buys: 0, maxBuys: 100, baseCost: 50 },
  dropTimer: { id: "dropTimer", buys: 0, maxBuys: 5, baseCost: 100 },
};

const initialPrestigeUpgrades: GameState["prestigeUpgrades"] = {
  morePoints: { id: "morePoints", buys: 0, maxBuys: 100, baseCost: 1 },
  moreXP: { id: "moreXP", buys: 0, maxBuys: 100, baseCost: 2 },
  morePP: { id: "morePP", buys: 0, maxBuys: 25, baseCost: 10 },
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
  rebirthPerks: {
    autoBuyUpgrades: false,
    bonusMult: false,
  },
  dropUpgrades: initialDropUpgrades,
  prestigeUpgrades: initialPrestigeUpgrades,
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
      if (upg.buys >= upg.maxBuys) return { state, leveledUp: false };
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

    case "BUY_PRESTIGE_UPGRADE": {
      const upg = state.prestigeUpgrades[action.id];
      if (upg.buys >= upg.maxBuys) return { state, leveledUp: false };
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

    case "PRESTIGE": {
      if (state.lifetimePoints < 1_000_000) return { state, leveledUp: false };
      const rawEarned = calcPrestigePoints(state.lifetimePoints);
      const ppGainMult =
        Math.pow(2, state.prestigeUpgrades.morePP.buys) *
        (state.rebirthPerks.bonusMult ? 2 : 1);
      const bonusPP = rawEarned * ppGainMult;
      return {
        state: {
          ...state,
          points: 0,
          runPoints: 0,
          totalDrops: 0,
          xp: 0,
          level: 1,
          prestigePoints: state.prestigePoints + bonusPP,
          dropUpgrades: { ...initialDropUpgrades },
        },
        leveledUp: false,
      };
    }

    case "REBIRTH": {
      const { which } = action;

      if (which === 1 && state.runPoints < 1e75) return { state, leveledUp: false };
      if (which === 2 && (state.runPoints < 1e100 || state.rebirthCount < 1))
        return { state, leveledUp: false };

      const newRebirthCount = state.rebirthCount + 1;

      const autoBuyUpgrades =
        state.rebirthPerks.autoBuyUpgrades || which === 1;
      const bonusMult = state.rebirthPerks.bonusMult || which === 2;

      return {
        state: {
          ...initialState,
          lifetimePoints: state.lifetimePoints,
          rebirthCount: newRebirthCount,
          rebirthPerks: {
            autoBuyUpgrades,
            bonusMult,
          },
        },
        leveledUp: false,
      };
    }

    case "LOAD":
      return {
        state: {
          ...initialState,
          ...action.state,
          lifetimePoints:
            action.state.lifetimePoints ??
            action.state.runPoints ??
            0,
          runPoints: action.state.runPoints ?? 0,
        },
        leveledUp: false,
      };

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
  buyPrestigeUpgrade: (id: PrestigeUpgrade["id"]) => void;
  prestige: () => void;
  rebirth: (which: 1 | 2) => void;
  dropAmount: number;
  xpAmount: number;
  dropTimerMs: number;
  xpProgress: number;
  xpRequired: number;
  canPrestige: boolean;
  canRebirth1: boolean;
  canRebirth2: boolean;
  showUpgrades: boolean;
  leveledUp: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);
const STORAGE_KEY = "dropper_game_v3";

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [combined, dispatch] = useReducer(wrappedReducer, {
    state: initialState,
    leveledUp: false,
  });

  const { state } = combined;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoBuyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDropTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const loaded = JSON.parse(raw) as GameState;
          dispatch({ type: "LOAD", state: loaded });
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 2000);
  }, [state]);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (autoDropTimerRef.current) clearInterval(autoDropTimerRef.current);
    const ms = getDropTimerMs(state);
    autoDropTimerRef.current = setInterval(() => {
      dispatch({ type: "DROP" });
    }, ms);
    return () => {
      if (autoDropTimerRef.current) clearInterval(autoDropTimerRef.current);
    };
  }, [state.dropUpgrades.dropTimer.buys]);

  useEffect(() => {
    if (autoBuyTimerRef.current) clearInterval(autoBuyTimerRef.current);
    if (!state.rebirthPerks.autoBuyUpgrades) return;
    autoBuyTimerRef.current = setInterval(() => {
      const s = stateRef.current;
      const ids: DropUpgrade["id"][] = ["dropAmount", "dropXP", "dropTimer"];
      let cheapestId: DropUpgrade["id"] | null = null;
      let cheapestCost = Infinity;
      for (const id of ids) {
        const upg = s.dropUpgrades[id];
        if (upg.buys >= upg.maxBuys) continue;
        const cost = dropUpgradeCost(upg);
        if (cost <= s.points && cost < cheapestCost) {
          cheapestCost = cost;
          cheapestId = id;
        }
      }
      if (cheapestId) {
        dispatch({ type: "BUY_DROP_UPGRADE", id: cheapestId });
      }
    }, 2000);
    return () => {
      if (autoBuyTimerRef.current) clearInterval(autoBuyTimerRef.current);
    };
  }, [state.rebirthPerks.autoBuyUpgrades]);

  const drop = useCallback(() => dispatch({ type: "DROP" }), []);
  const buyDropUpgrade = useCallback(
    (id: DropUpgrade["id"]) => dispatch({ type: "BUY_DROP_UPGRADE", id }),
    []
  );
  const buyPrestigeUpgrade = useCallback(
    (id: PrestigeUpgrade["id"]) =>
      dispatch({ type: "BUY_PRESTIGE_UPGRADE", id }),
    []
  );
  const prestige = useCallback(() => dispatch({ type: "PRESTIGE" }), []);
  const rebirth = useCallback(
    (which: 1 | 2) => dispatch({ type: "REBIRTH", which }),
    []
  );

  const dropAmount = useMemo(() => getDropAmount(state), [state]);
  const xpAmount = useMemo(() => getXPAmount(state), [state]);
  const dropTimerMs = useMemo(() => getDropTimerMs(state), [state]);
  const xpRequired = useMemo(() => xpForLevel(state.level), [state.level]);
  const xpProgress = state.xp / xpRequired;
  const canPrestige = state.lifetimePoints >= 1_000_000;
  const canRebirth1 = state.runPoints >= 1e75;
  const canRebirth2 = state.runPoints >= 1e100 && state.rebirthCount >= 1;
  const showUpgrades = state.totalDrops >= 10;

  const value = useMemo(
    () => ({
      state,
      drop,
      buyDropUpgrade,
      buyPrestigeUpgrade,
      prestige,
      rebirth,
      dropAmount,
      xpAmount,
      dropTimerMs,
      xpProgress,
      xpRequired,
      canPrestige,
      canRebirth1,
      canRebirth2,
      showUpgrades,
      leveledUp: combined.leveledUp,
    }),
    [
      state,
      drop,
      buyDropUpgrade,
      buyPrestigeUpgrade,
      prestige,
      rebirth,
      dropAmount,
      xpAmount,
      dropTimerMs,
      xpProgress,
      xpRequired,
      canPrestige,
      canRebirth1,
      canRebirth2,
      showUpgrades,
      combined.leveledUp,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
