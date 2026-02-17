/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        danger: 'var(--danger)',
        'panel-border': 'var(--panel-border)',
        divider: 'var(--divider)',
        'control-bg': 'var(--control-bg)',
        'control-border': 'var(--control-border)',
        'control-bg-muted': 'var(--control-bg-muted)',
        'control-border-muted': 'var(--control-border-muted)',
        'control-hover-border': 'var(--control-hover-border)',
        'control-hover-bg': 'var(--control-hover-bg)',
        'workspace-bg': 'var(--workspace-bg)',
        'status-bg': 'var(--status-bg)',
        'status-border': 'var(--status-border)',
        'status-text': 'var(--status-text)',
        'modal-bg': 'var(--modal-bg)',
        'modal-border': 'var(--modal-border)',
        'event-item-bg': 'var(--event-item-bg)',
        'event-item-border': 'var(--event-item-border)',
        'event-item-hover-bg': 'var(--event-item-hover-bg)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        base: ['12px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        panel: 'var(--panel-shadow)',
        floating: 'var(--shadow-floating)',
        modal: 'var(--shadow-modal)',
      },
      borderRadius: {
        control: '14px',
        panel: '12px',
        small: '6px',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      },
    },
  },
  plugins: [],
}
