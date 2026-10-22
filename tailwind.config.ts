import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#25313C", muted: "#71808C", paper: "#F7F9F7", mint: "#DDF3E8", teal: "#2C9B83", coral: "#F37F68", navy: "#21394A" }, boxShadow: { card: "0 12px 35px rgba(37,49,60,.08)" } } },
  plugins: []
};
export default config;
