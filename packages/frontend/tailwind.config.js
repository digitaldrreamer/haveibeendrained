/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Brutalist color palette - high contrast, bold colors
                background: '#0f172a',
                surface: '#1e293b',
                'surface-elevated': '#334155',
                primary: {
                    DEFAULT: '#8b5cf6',
                    hover: '#7c3aed',
                },
                text: {
                    DEFAULT: '#f8fafc',
                    muted: '#94a3b8',
                },
                // Brutalist accent colors
                accent: {
                    blue: '#3b82f6',
                    pink: '#ec4899',
                    purple: '#8b5cf6',
                },
                // Status colors
                success: '#22c55e',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#3b82f6',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
                mono: ['Courier New', 'Courier', 'monospace'],
            },
            // Brutalist shadows - hard, offset shadows
            boxShadow: {
                'brutal-sm': '4px 4px 0 0 #000000',
                'brutal-md': '6px 6px 0 0 #000000',
                'brutal-lg': '8px 8px 0 0 #000000',
                'brutal-xl': '12px 12px 0 0 #000000',
                'brutal-colored': '6px 6px 0 0 #8b5cf6',
            },
            // Brutalist borders - thick, bold
            borderWidth: {
                'brutal': '3px',
                'brutal-thick': '4px',
            },
            // Minimal border radius for brutalist look
            borderRadius: {
                'brutal': '0px',
                'brutal-sm': '2px',
                'brutal-md': '4px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};

