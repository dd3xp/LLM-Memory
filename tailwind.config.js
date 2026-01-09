/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kaggle 风格 + 终端主题颜色
        terminal: {
          bg: '#0a0e1a',        // 深色背景
          surface: '#141824',    // 卡片背景
          border: '#1e2432',     // 边框
          user: '#4a9eff',       // 用户消息（蓝色）
          assistant: '#00ff88',  // 助手消息（绿色）
          muted: '#6b7280',      // 次要文字
          text: '#e5e7eb',       // 主要文字
        },
        kaggle: {
          primary: '#20beff',    // Kaggle 主蓝色
          dark: '#0a0e1a',       // 深色背景
          card: '#1a1f2e',       // 卡片
          hover: '#262d3d',      // 悬停
        }
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
