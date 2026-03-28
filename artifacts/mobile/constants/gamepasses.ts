export type GamepassId = "opAutoDropper" | "doublePoints" | "doubleXP";

export interface Gamepass {
  id: GamepassId;
  name: string;
  description: string;
  goldCost: number;
  icon: string;
}

export const GAMEPASSES: Gamepass[] = [
  {
    id: "opAutoDropper",
    name: "OP Auto Dropper",
    description: "Auto-drop every 100ms instead of 500ms",
    goldCost: 0,
    icon: "lightning-bolt",
  },
  {
    id: "doublePoints",
    name: "2x Points",
    description: "Double all point gains permanently",
    goldCost: 0,
    icon: "star-four-points",
  },
  {
    id: "doubleXP",
    name: "2x XP",
    description: "Double all XP gains permanently",
    goldCost: 0,
    icon: "arrow-up-bold-circle",
  },
];

export function getGamepass(id: string): Gamepass | undefined {
  return GAMEPASSES.find((g) => g.id === id);
}
