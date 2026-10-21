/** @type {import('tailwindcss').Config} */
// Tokens follow the client prototype's effective theme (folder-alignment.css).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Pixel sizes from the prototype, with no bundled line-height (the prototype uses `normal`).
    fontSize: {
      '2xs': '10px',
      xs: '12px',
      sm: '14px',
      base: '14px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        serif: ["'Libre Baskerville'", 'serif'],
      },
      colors: {
        ink: '#0f172a',
        heading: '#1e293b',
        muted: '#64748b',
        body: '#475569',
        canvas: '#f8fafc',
        line: '#e2e8f0',
        field: '#ded8e4',
        primary: { DEFAULT: '#3b82f6', hover: '#2563eb', ring: '#93c5fd' },
        accent: { DEFAULT: '#5b4db4', soft: '#f1effa', deep: '#1e1b4b' },
        sidebar: { DEFAULT: '#1e293b', text: '#e2e8f0', active: '#334155' },
        note: '#eff6ff',
        message: '#f5f2f8',
        divider: '#e6e0ec',
        faint: '#8f8498',
        success: { DEFAULT: '#587056', soft: '#e8efe6' },
        // Same as Tailwind's amber-700 / amber-50, which the "New" and "Pending" badges used before.
        warning: { DEFAULT: '#b45309', soft: '#fffbeb' },
        // soft = Tailwind's red-50, which the danger badge and button hover used before.
        danger: { DEFAULT: '#a12323', soft: '#fef2f2' },
        toast: '#3e3448',
      },
      borderRadius: {
        card: '8px',
        dialog: '18px',
      },
      boxShadow: {
        card: '0 1px 3px #0000000d',
        dialog: '0 30px 100px #39274433',
      },
      width: { sidebar: '250px' },
      spacing: { sidebar: '250px', header: '80px' },
      maxWidth: { page: '1500px' },
    },
  },
  plugins: [],
};
