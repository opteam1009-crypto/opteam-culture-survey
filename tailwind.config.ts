import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      colors: {
        ink: "#111827",
        muted: "#6b7280",
        line: "#e5e7eb",
        brand: "#1f4d8f",
        brandSoft: "#eef3fb",
        brandTint: "#f7faff",
        accent: "#2a78d6",
      },
    },
  },
  plugins: [],
};
export default config;
