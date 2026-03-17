import themePlugin from './plugin.js'
import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

console.log('tailwind preset.js')

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  plugins: [forms, typography, themePlugin],
}
