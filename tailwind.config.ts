import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { neon: { purple: "#a855f7", blue: "#3b82f6", cyan: "#22d3ee" } } } },
  plugins: [],
};
export default config;
