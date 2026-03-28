const CYAN = "#00E5FF";
const CYAN_DIM = "#00B8D4";
const NAVY = "#050D1A";
const NAVY_CARD = "#0A1628";
const NAVY_BORDER = "#1A2A45";
const PRESTIGE_GOLD = "#FFD700";
const PRESTIGE_ORANGE = "#FF8C00";
const REBIRTH_PURPLE = "#A855F7";
const REBIRTH_PINK = "#EC4899";
const REBIRTH_BLUE = "#3B82F6";
const REBIRTH_EMERALD = "#10B981";
const REBIRTH_AMBER = "#F59E0B";
const XP_GREEN = "#00FF88";
const TEXT_PRIMARY = "#E8F4FF";
const TEXT_SECONDARY = "#6B8CAE";
const TEXT_DIM = "#3A5068";

const COIN_BRONZE = "#CD7F32";
const COIN_SILVER = "#C0C0C0";
const COIN_GOLD = "#FFB800";
const COIN_LEGENDARY = "#E040FB";

export const Colors = {
  bg: NAVY,
  bgCard: NAVY_CARD,
  bgBorder: NAVY_BORDER,
  accent: CYAN,
  accentDim: CYAN_DIM,
  prestige: PRESTIGE_GOLD,
  prestigeOrange: PRESTIGE_ORANGE,
  rebirth: REBIRTH_PURPLE,
  rebirthPink: REBIRTH_PINK,
  rebirthBlue: REBIRTH_BLUE,
  rebirthEmerald: REBIRTH_EMERALD,
  rebirthAmber: REBIRTH_AMBER,
  xp: XP_GREEN,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textDim: TEXT_DIM,
  gold: "#FFD700",
  danger: "#FF4444",
  white: "#FFFFFF",
  coinBronze: COIN_BRONZE,
  coinSilver: COIN_SILVER,
  coinGold: COIN_GOLD,
  coinLegendary: COIN_LEGENDARY,
};

export const Gradients: Record<string, [string, string, string]> = {
  bgAtmosphere: [NAVY, '#081428', NAVY],
  cardHighlight: ['#112240', NAVY_CARD, NAVY_CARD],
  xpBar: ['#00CC6A', XP_GREEN, '#66FFB2'],
  dropGlow: [CYAN + '00', CYAN + '30', CYAN + '00'],
  splash: [NAVY, '#0A1E3D', NAVY],
  tabBar: ['transparent', NAVY_CARD + 'E0', NAVY_CARD],
};

export default Colors;
