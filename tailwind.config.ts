import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores do The Park (logótipo: círculo teal #239A98 com o símbolo a branco)
        park: {
          50: "#effbfa",
          100: "#d5f3f2",
          200: "#ade6e4",
          300: "#78d3d0",
          400: "#45bdba",
          500: "#2aaba8",
          600: "#239A98", // cor do logótipo
          700: "#1c7c7a",
          800: "#196463",
          900: "#175352",
          950: "#0a3332",
        },
        "park-navy": "#1b202b", // azul escuro usado nas imagens do site do The Park
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
