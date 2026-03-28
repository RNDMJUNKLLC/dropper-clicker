# Gamepasses (IAP) System

## Overview
Add a gamepass system with a premium currency (Gold). Three initial gamepasses, all free for now (prices set later). Gamepasses are permanent one-time purchases that persist across rebirths.

## Files to Create

### 1. `artifacts/mobile/constants/gamepasses.ts`
Define the three gamepasses:
- **`opAutoDropper`** — "OP Auto Dropper": 100ms auto-drop interval (replaces the 500ms tier-1 auto-click when owned)
- **`doublePoints`** — "2x Points": 2x multiplier on all point gains
- **`doubleXP`** — "2x XP": 2x multiplier on all XP gains
- Each has: `id`, `name`, `description`, `goldCost` (0 for now), `icon`

### 2. `artifacts/mobile/components/GamepassButton.tsx`
Small button in the header row (next to milestones button). Gold-colored coin icon. Always visible.

### 3. `artifacts/mobile/components/GamepassModal.tsx`
Popup modal (same pattern as `MilestonesModal`) showing:
- Gold balance at top
- List of gamepasses: name, description, owned badge or buy button
- Each pass shows "FREE" price for now

## Files to Modify

### 4. `artifacts/mobile/context/GameContext.tsx`
- Add to `GameState`:
  - `gold: number` (premium currency)
  - `ownedGamepasses: string[]` (list of purchased pass IDs)
- Add actions:
  - `BUY_GAMEPASS` — deducts gold (or free), adds pass ID to `ownedGamepasses`
- Wire gamepass effects into formulas:
  - `getDropAmount()`: multiply by 2 if `doublePoints` owned
  - `getXPAmount()`: multiply by 2 if `doubleXP` owned
  - Auto-click `useEffect`: use 100ms interval if `opAutoDropper` owned (instead of 500ms)
- Add to `GameContextValue`:
  - `buyGamepass(id: string)`
  - `hasGamepass(id: string)` helper
- Preserve `ownedGamepasses` and `gold` across rebirths (in REBIRTH action)
- Merge in LOAD action with defaults (`gold: 0`, `ownedGamepasses: []`)

### 5. `artifacts/mobile/app/(tabs)/index.tsx`
- Import `GamepassButton` + `GamepassModal`
- Add `GamepassButton` to `headerRight` row
- Add `GamepassModal` with state toggle

### 6. `artifacts/mobile/constants/colors.ts`
- Add `gold: "#FFD700"` (reuse prestige gold or add distinct shade for premium gold)

## Key Decisions
- Gamepasses are **permanent** — never reset by prestige or rebirth
- Gold balance also persists across rebirths
- The OP Auto Dropper replaces the tier-1 auto-click speed (500ms → 100ms), only when tier-1 is already unlocked
- All passes cost 0 gold for now (shown as "FREE")
- No gold earning mechanism yet — just the balance field ready for daily challenges later
