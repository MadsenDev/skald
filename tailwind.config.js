/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          'bg-primary': 'var(--theme-bg-primary)',
          'bg-secondary': 'var(--theme-bg-secondary)',
          'bg-tertiary': 'var(--theme-bg-tertiary)',
          'text-primary': 'var(--theme-text-primary)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-tertiary': 'var(--theme-text-tertiary)',
          'border-primary': 'var(--theme-border-primary)',
          'border-secondary': 'var(--theme-border-secondary)',
          'accent': 'var(--theme-accent)',
          'accent-hover': 'var(--theme-accent-hover)',
          'accent-text': 'var(--theme-accent-text)',
          'success': 'var(--theme-success)',
          'warning': 'var(--theme-warning)',
          'error': 'var(--theme-error)',
          'info': 'var(--theme-info)',
          'hover': 'var(--theme-hover)',
          'active': 'var(--theme-active)',
        },
      },
    },
  },
  plugins: [],
}

