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
import { fetchCloudSave, pushCloudSave, type CloudSyncStatus, type FetchResult } from "@/lib/cloudSync";

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

export interface CoinUpgrade {
  id: "coinMagnet" | "luckyDrops" | "coinRush";
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
    autoBuyPrestigeUpgrades: boolean;
    doubleCoinGain: boolean;
    pointTreeUnlocked: boolean;
    tripleMult: boolean;
    autoBuyPointTree: boolean;
    diamondsUnlocked: boolean;
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
  coins: number;
  lifetimeCoins: number;
  coinUpgrades: {
    coinMagnet: CoinUpgrade;
    luckyDrops: CoinUpgrade;
    coinRush: CoinUpgrade;
  };
}

type Action =
  | { type: "DROP" }
  | { type: "BUY_DROP_UPGRADE"; id: DropUpgrade["id"] }
  | { type: "BUY_PRESTIGE_UPGRADE"; id: PrestigeUpgrade["id"] }
  | { type: "COLLECT_COIN"; value: number }
  | { type: "BUY_COIN_UPGRADE"; id: CoinUpgrade["id"] }
  | { type: "PRESTIGE" }
  | { type: "REBIRTH"; which: 1 | 2 | 3 | 4 | 5 }
  | { type: "LOAD"; state: GameState };

const XP_BASE = 100;
const XP_SCALE = 3.5;
const DROP_COST_SCALE = 1.14;
const PRESTIGE_COST_SCALE = 1.5;

export function xpForLevel(level: number): number {
  return XP_BASE * Math.pow(XP_SCALE, level - 1);
}

export function getLevelMultiplier(level: number): number {
  return Math.pow(2, level - 1);
}

export function dropUpgradeCost(upgrade: DropUpgrade): number {
  return Math.ceil(upgrade.baseCost * Math.pow(DROP_COST_SCALE, upgrade.buys));
}

export function prestigeUpgradeCost(upgrade: PrestigeUpgrade): number {
  return upgrade.baseCost * Math.pow(PRESTIGE_COST_SCALE, upgrade.buys);
}

export function calcPrestigePoints(currentPoints: number): number {
  return Math.pow(currentPoints / 1_000_000, 0.43);
}

const COIN_COST_SCALE = 1.3;

export function coinUpgradeCost(upgrade: CoinUpgrade): number {
  return Math.ceil(upgrade.baseCost * Math.pow(COIN_COST_SCALE, upgrade.buys));
}

function getDropAmount(state: GameState): number {
  const baseAmount = 1 + state.dropUpgrades.dropAmount.buys;
  const prestigeMult = Math.pow(2, state.prestigeUpgrades.morePoints.buys);
  const rebirthMult = state.rebirthPerks.tripleMult ? 3 : 1;
  const levelMult = getLevelMultiplier(state.level);
  return baseAmount * prestigeMult * rebirthMult * levelMult;
}

function getXPAmount(state: GameState): number {
  const baseXP = 1 + 0.5 * state.dropUpgrades.dropXP.buys;
  const prestigeMult = Math.pow(2, state.prestigeUpgrades.moreXP.buys);
  const r2Mult = state.rebirthPerks.bonusMult ? 2 : 1;
  const r4Mult = state.rebirthPerks.tripleMult ? 3 : 1;
  return baseXP * prestigeMult * r2Mult * r4Mult;
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
  morePP: { id: "morePP", buys: 0, maxBuys: 15, baseCost: 10 },
};

const initialCoinUpgrades: GameState["coinUpgrades"] = {
  coinMagnet: { id: "coinMagnet", buys: 0, maxBuys: 10, baseCost: 10 },
  luckyDrops: { id: "luckyDrops", buys: 0, maxBuys: 10, baseCost: 25 },
  coinRush: { id: "coinRush", buys: 0, maxBuys: 10, baseCost: 50 },
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
    autoBuyPrestigeUpgrades: false,
    doubleCoinGain: false,
    pointTreeUnlocked: false,
    tripleMult: false,
    autoBuyPointTree: false,
    diamondsUnlocked: false,
  },
  dropUpgrades: initialDropUpgrades,
  prestigeUpgrades: initialPrestigeUpgrades,
  coins: 0,
  lifetimeCoins: 0,
  coinUpgrades: initialCoinUpgrades,
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

    case "COLLECT_COIN": {
      const coinMult = state.rebirthPerks.doubleCoinGain ? 2 : 1;
      const total = action.value * coinMult;
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

    case "PRESTIGE": {
      if (state.points < 1_000_000) return { state, leveledUp: false };
      const rawEarned = calcPrestigePoints(state.points);
      const ppGainMult =
        Math.pow(2, state.prestigeUpgrades.morePP.buys) *
        (state.rebirthPerks.bonusMult ? 2 : 1) *
        (state.rebirthPerks.tripleMult ? 3 : 1);
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

      if (which === 1 && state.runPoints < 1e25) return { state, leveledUp: false };
      if (which === 2 && (state.runPoints < 1e50 || state.rebirthCount < 1))
        return { state, leveledUp: false };
      if (which === 3 && (state.runPoints < 1e75 || state.rebirthCount < 2))
        return { state, leveledUp: false };
      if (which === 4 && (state.runPoints < 1e100 || state.rebirthCount < 3))
        return { state, leveledUp: false };
      if (which === 5 && (state.runPoints < 1e150 || state.rebirthCount < 4))
        return { state, leveledUp: false };

      const newRebirthCount = state.rebirthCount + 1;
      const newPerks = {
        autoBuyUpgrades: state.rebirthPerks.autoBuyUpgrades || which === 1,
        bonusMult: state.rebirthPerks.bonusMult || which === 2,
        autoBuyPrestigeUpgrades: state.rebirthPerks.autoBuyPrestigeUpgrades || which === 3,
        doubleCoinGain: state.rebirthPerks.doubleCoinGain || which === 3,
        pointTreeUnlocked: state.rebirthPerks.pointTreeUnlocked || which === 3,
        tripleMult: state.rebirthPerks.tripleMult || which === 4,
        autoBuyPointTree: state.rebirthPerks.autoBuyPointTree || which === 5,
        diamondsUnlocked: state.rebirthPerks.diamondsUnlocked || which === 5,
      };

      return {
        state: {
          ...initialState,
          lifetimePoints: state.lifetimePoints,
          rebirthCount: newRebirthCount,
          rebirthPerks: newPerks,
        },
        leveledUp: false,
      };
    }

    case "LOAD": {
      const loadedPerks = action.state.rebirthPerks ?? {};
      const loadedPrestige = action.state.prestigeUpgrades ?? {};
      const clampedPrestigeUpgrades = {
        ...initialPrestigeUpgrades,
        ...loadedPrestige,
        morePP: {
          ...initialPrestigeUpgrades.morePP,
          ...(loadedPrestige.morePP ?? {}),
          buys: Math.min(
            loadedPrestige.morePP?.buys ?? 0,
            initialPrestigeUpgrades.morePP.maxBuys
          ),
          maxBuys: initialPrestigeUpgrades.morePP.maxBuys,
        },
      };
      return {
        state: {
          ...initialState,
          ...action.state,
          lifetimePoints: action.state.lifetimePoints ?? action.state.runPoints ?? 0,
          runPoints: action.state.runPoints ?? 0,
          prestigeUpgrades: clampedPrestigeUpgrades,
          rebirthPerks: {
            ...initialState.rebirthPerks,
            ...loadedPerks,
          },
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
  buyPrestigeUpgrade: (id: PrestigeUpgrade["id"]) => void;
  collectCoin: (value: number) => void;
  buyCoinUpgrade: (id: CoinUpgrade["id"]) => void;
  prestige: () => void;
  rebirth: (which: 1 | 2 | 3 | 4 | 5) => void;
  dropAmount: number;
  xpAmount: number;
  dropTimerMs: number;
  xpProgress: number;
  xpRequired: number;
  levelMultiplier: number;
  canPrestige: boolean;
  canRebirth1: boolean;
  canRebirth2: boolean;
  canRebirth3: boolean;
  canRebirth4: boolean;
  canRebirth5: boolean;
  showUpgrades: boolean;
  coinsUnlocked: boolean;
  pointTreeUnlocked: boolean;
  leveledUp: boolean;
  cloudSyncStatus: CloudSyncStatus;
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
  const { isAuthenticated, user } = useAuth();
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoBuyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoBuyPrestigeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDropTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    if (currentState.lifetimePoints === 0 && currentState.totalDrops === 0) return;

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
        if (stateRef.current.lifetimePoints > 0 || stateRef.current.totalDrops > 0) {
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
          const cloudLP = (retryResult.gameState.lifetimePoints as number) ?? 0;
          if (cloudLP > localLP) {
            dispatch({ type: "LOAD", state: retryResult.gameState });
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(retryResult.gameState));
            setCloudSyncStatus("saved");
            setTimeout(() => {
              setCloudSyncStatus((prev) => (prev === "saved" ? "idle" : prev));
            }, 3000);
            return;
          }
        }
        doCloudSave();
        return;
      }

      if (pendingCloudSaveRef.current || Date.now() - lastCloudSaveRef.current >= CLOUD_SYNC_INTERVAL) {
        doCloudSave();
      }
    }, CLOUD_SYNC_INTERVAL);

    return () => {
      if (cloudSaveTimerRef.current) clearInterval(cloudSaveTimerRef.current);
    };
  }, [isAuthenticated, doCloudSave]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const markDirty = () => {
      pendingCloudSaveRef.current = true;
    };

    markDirty();
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

  useEffect(() => {
    if (autoBuyPrestigeTimerRef.current) clearInterval(autoBuyPrestigeTimerRef.current);
    if (!state.rebirthPerks.autoBuyPrestigeUpgrades) return;
    autoBuyPrestigeTimerRef.current = setInterval(() => {
      const s = stateRef.current;
      const ids: PrestigeUpgrade["id"][] = ["morePoints", "moreXP", "morePP"];
      let cheapestId: PrestigeUpgrade["id"] | null = null;
      let cheapestCost = Infinity;
      for (const id of ids) {
        const upg = s.prestigeUpgrades[id];
        if (upg.buys >= upg.maxBuys) continue;
        const cost = prestigeUpgradeCost(upg);
        if (cost <= s.prestigePoints && cost < cheapestCost) {
          cheapestCost = cost;
          cheapestId = id;
        }
      }
      if (cheapestId) {
        dispatch({ type: "BUY_PRESTIGE_UPGRADE", id: cheapestId });
      }
    }, 2000);
    return () => {
      if (autoBuyPrestigeTimerRef.current) clearInterval(autoBuyPrestigeTimerRef.current);
    };
  }, [state.rebirthPerks.autoBuyPrestigeUpgrades]);

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
    (which: 1 | 2 | 3 | 4 | 5) => dispatch({ type: "REBIRTH", which }),
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

  const dropAmount = useMemo(() => getDropAmount(state), [state]);
  const xpAmount = useMemo(() => getXPAmount(state), [state]);
  const dropTimerMs = useMemo(() => getDropTimerMs(state), [state]);
  const xpRequired = useMemo(() => xpForLevel(state.level), [state.level]);
  const levelMultiplier = useMemo(() => getLevelMultiplier(state.level), [state.level]);
  const xpProgress = state.xp / xpRequired;
  const canPrestige = state.points >= 1_000_000;
  const canRebirth1 = state.runPoints >= 1e25;
  const canRebirth2 = state.runPoints >= 1e50 && state.rebirthCount >= 1;
  const canRebirth3 = state.runPoints >= 1e75 && state.rebirthCount >= 2;
  const canRebirth4 = state.runPoints >= 1e100 && state.rebirthCount >= 3;
  const canRebirth5 = state.runPoints >= 1e150 && state.rebirthCount >= 4;
  const showUpgrades = state.totalDrops >= 10;
  const coinsUnlocked = state.rebirthPerks.autoBuyUpgrades;
  const pointTreeUnlocked = state.rebirthPerks.pointTreeUnlocked;

  const value = useMemo(
    () => ({
      state,
      drop,
      buyDropUpgrade,
      buyPrestigeUpgrade,
      collectCoin,
      buyCoinUpgrade,
      prestige,
      rebirth,
      dropAmount,
      xpAmount,
      dropTimerMs,
      xpProgress,
      xpRequired,
      levelMultiplier,
      canPrestige,
      canRebirth1,
      canRebirth2,
      canRebirth3,
      canRebirth4,
      canRebirth5,
      showUpgrades,
      coinsUnlocked,
      pointTreeUnlocked,
      leveledUp: combined.leveledUp,
      cloudSyncStatus,
    }),
    [
      state,
      drop,
      buyDropUpgrade,
      buyPrestigeUpgrade,
      collectCoin,
      buyCoinUpgrade,
      prestige,
      rebirth,
      dropAmount,
      xpAmount,
      dropTimerMs,
      xpProgress,
      xpRequired,
      levelMultiplier,
      canPrestige,
      canRebirth1,
      canRebirth2,
      canRebirth3,
      canRebirth4,
      canRebirth5,
      showUpgrades,
      coinsUnlocked,
      pointTreeUnlocked,
      combined.leveledUp,
      cloudSyncStatus,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
