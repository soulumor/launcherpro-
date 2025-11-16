/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors (from Figma)
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        'input-background': 'var(--input-background)',
        ring: 'var(--ring)',
        
        // All-black base (legacy)
        'gamer-black': '#000000',
        'gamer-dark': '#0a0a0a',
        'gamer-darker': '#111111',
        'gamer-gray': '#1a1a1a',
        'gamer-light-gray': '#2a2a2a',
        
        // Neon accents (legacy)
        'neon-cyan': '#00ffff',
        'neon-green': '#00ff41',
        'neon-purple': '#b026ff',
        'neon-blue': '#0066ff',
        'neon-pink': '#ff00ff',
        
        // Legacy (mantendo compatibilidade)
        'steam-dark': '#000000',
        'steam-blue': '#00ffff',
        'steam-light': '#1a1a1a',
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff',
        'neon-green': '0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41',
        'neon-purple': '0 0 10px #b026ff, 0 0 20px #b026ff, 0 0 30px #b026ff',
        'glow': '0 0 20px rgba(0, 255, 255, 0.5)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ffff, 0 0 10px #00ffff' },
          '100%': { boxShadow: '0 0 20px #00ffff, 0 0 30px #00ffff, 0 0 40px #00ffff' },
        },
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}

