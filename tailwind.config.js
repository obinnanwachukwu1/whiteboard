/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
		'./electron/**/*.{js,ts}',
	],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'Inter',
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'Segoe UI',
					'Roboto',
					'Helvetica Neue',
					'Arial',
					'"Noto Sans"',
					'sans-serif',
					'"Apple Color Emoji"',
					'"Segoe UI Emoji"',
					'"Segoe UI Symbol"',
				],
			},
			colors: {
				canvas: {
					primary: '#2d3b45',
					accent: '#1188cc',
					bg: '#f5f6f8',
					panel: '#ffffff',
					border: '#e2e5ea',
					muted: '#6b7280',
				},
				brand: {
					DEFAULT: '#6366F1',
					foreground: '#ffffff',
					soft: '#EEF2FF',
				},
				ui: {
					bg: '#F8FAFC',
					surface: '#FFFFFF',
					border: '#E5E7EB',
					text: '#0F172A',
					muted: '#64748B',
				},
			},
			borderRadius: {
				card: '0.75rem',
				control: '0.375rem',
			},
			boxShadow: {
				card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)',
			},
		},
	},
	plugins: [],
}

