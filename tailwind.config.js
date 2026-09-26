/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1d4ed8',
        secondary: '#0f172a',
        accent: '#f59e0b',
        border: '#e2e8f0',
        muted: '#f8fafc',
        input: '#e2e8f0',
        background: '#f8fafc',
        foreground: '#0f172a',
        'primary-foreground': '#ffffff',
        'secondary-foreground': '#e2e8f0',
        destructive: '#dc2626',
        'destructive-foreground': '#ffffff',
      },
    },
  },
  plugins: [],
};
