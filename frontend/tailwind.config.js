/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#070b13",
          card: "rgba(15, 23, 42, 0.7)",
          cyan: "#00f2fe",
          pink: "#f43f5e",
          purple: "#9333ea",
          blue: "#2563eb",
          green: "#10b981",
          yellow: "#eab308",
          indigo: "#4f46e5"
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 242, 254, 0.45)',
        'neon-pink': '0 0 15px rgba(244, 63, 94, 0.45)',
        'neon-green': '0 0 15px rgba(16, 185, 129, 0.45)',
        'neon-purple': '0 0 15px rgba(147, 51, 234, 0.45)',
      }
    },
  },
  plugins: [],
}
