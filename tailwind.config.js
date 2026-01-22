/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
            colors: {
        primary: {
            DEFAULT: 'var(--color-primary)',
            strong: 'var(--color-primary-strong)',
            hover: 'var(--color-primary-hover)',
            muted: 'var(--color-primary-muted)',
            '25': 'var(--color-primary-25)',
            '50': 'var(--color-primary-50)',
            '75': 'var(--color-primary-75)',
        },
        background: {
            DEFAULT: 'var(--color-bg)',
            '25': 'var(--color-bg-25)',
            '50': 'var(--color-bg-50)',
            '75': 'var(--color-bg-75)',
        },
        panel: {
            DEFAULT: 'var(--color-panel)',
            muted: 'var(--color-panel-muted)',
            '25': 'var(--color-panel-25)',
            '50': 'var(--color-panel-50)',
            '75': 'var(--color-panel-75)',
        },
        card: {
            DEFAULT: 'var(--color-card)',
            hover: 'var(--color-card-hover)',
            '25': 'var(--color-card-25)',
            '50': 'var(--color-card-50)',
            '75': 'var(--color-card-75)',
        },
        border: {
            DEFAULT: 'var(--color-border)',
            '25': 'var(--color-border-25)',
            '50': 'var(--color-border-50)',
            '75': 'var(--color-border-75)',
        },
        // Text 顏色系列
        textDefaultColor: 'var(--color-text-default)',
        muted: 'var(--color-text-muted)',
        sub: 'var(--color-text-sub)',
        test: 'var(--color-test)',
        test2: 'var(--color-test2)',
      },
      textColor: {
        default: 'var(--color-text-default)',
        emphasized: 'var(--color-text-emphasized)',
        placeholder: 'var(--color-text-placeholder)',
      }
    },
  },
  plugins: [],
}

