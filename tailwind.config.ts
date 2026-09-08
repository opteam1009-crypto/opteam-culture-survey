import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6b7280",
        line: "#e5e7eb",
        brand: "#1f4d8f",
        brandSoft: "#eef3fb",
      },
    },
  },
  plugins: [],
};
export default config;
