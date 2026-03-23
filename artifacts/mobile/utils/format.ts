export function formatNumber(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "???";
  if (n === 0) return "0";
  if (n < 0) return "-" + formatNumber(-n);

  if (n >= 1e6) {
    const exp = Math.floor(Math.log10(n));
    const mantissa = n / Math.pow(10, exp);
    return `${mantissa.toFixed(2)}e${exp}`;
  }

  if (n >= 1e3) {
    return (n / 1e3).toFixed(2) + "K";
  }

  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

export function formatPP(n: number): string {
  if (n === 0) return "0.000";
  if (n < 0.001) return n.toExponential(2);
  if (n < 1) return n.toFixed(3);
  if (n < 1000) return n.toFixed(2);
  return formatNumber(n);
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
