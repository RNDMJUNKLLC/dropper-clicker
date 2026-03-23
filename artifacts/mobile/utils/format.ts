const SUFFIXES = [
  { value: 1e303, suffix: "Dc" },
  { value: 1e300, suffix: "Nc" },
  { value: 1e297, suffix: "Oc" },
  { value: 1e294, suffix: "Sc" },
  { value: 1e291, suffix: "Sp" },
  { value: 1e288, suffix: "Sx" },
  { value: 1e285, suffix: "Qi" },
  { value: 1e282, suffix: "Qt" },
  { value: 1e279, suffix: "Tr" },
  { value: 1e276, suffix: "Du" },
  { value: 1e273, suffix: "Ud" },
  { value: 1e270, suffix: "Vg" },
  { value: 1e267, suffix: "Nv" },
  { value: 1e264, suffix: "Ov" },
  { value: 1e261, suffix: "Sv" },
  { value: 1e258, suffix: "Spv" },
  { value: 1e255, suffix: "Sxv" },
  { value: 1e252, suffix: "Qiv" },
  { value: 1e249, suffix: "Qtv" },
  { value: 1e246, suffix: "Trv" },
  { value: 1e243, suffix: "Dv" },
  { value: 1e240, suffix: "Uv" },
  { value: 1e6, suffix: "M" },
  { value: 1e9, suffix: "B" },
  { value: 1e12, suffix: "T" },
  { value: 1e15, suffix: "Qa" },
  { value: 1e18, suffix: "Qi" },
  { value: 1e21, suffix: "Sx" },
  { value: 1e24, suffix: "Sp" },
  { value: 1e27, suffix: "Oc" },
  { value: 1e30, suffix: "No" },
  { value: 1e33, suffix: "Dc" },
];

export function formatNumber(n: number): string {
  if (!isFinite(n)) return "???";
  if (n === 0) return "0";
  if (n < 0) return "-" + formatNumber(-n);

  if (n >= 1e6) {
    const exp = Math.floor(Math.log10(n));
    const mantissa = n / Math.pow(10, exp);
    return `${mantissa.toFixed(2)}e${exp}`;
  }

  if (n >= 1000) {
    return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

export function formatPP(n: number): string {
  if (n < 1) return n.toFixed(3);
  if (n < 1000) return n.toFixed(2);
  return formatNumber(n);
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
