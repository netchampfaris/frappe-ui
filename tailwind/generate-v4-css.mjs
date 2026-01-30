import fs from 'fs'

const colors = JSON.parse(
  fs.readFileSync(new URL('./colors.json', import.meta.url)),
)

const resolveColorReference = (reference) => {
  const [mode, color, shade] = reference.split('/')
  if (mode === 'lightMode') {
    return colors.lightMode[color][shade]
  }
  if (mode === 'darkMode') {
    return colors.darkMode[color][shade]
  }
  if (mode === 'overlay') {
    return colors.overlay[color][shade]
  }
  if (mode === 'neutral') {
    return colors.neutral[color]
  }
  return null
}

const resolveColorToken = (reference) => {
  const [mode, color, shade] = reference.split('/')
  if (mode === 'lightMode') {
    return `var(--color-${color}-${shade})`
  }
  if (mode === 'darkMode') {
    return `var(--color-dark-${color}-${shade})`
  }
  if (mode === 'overlay') {
    return `var(--color-${color}-overlay-${shade})`
  }
  if (mode === 'neutral') {
    return `var(--color-${color})`
  }
  return null
}

const generateCSSVariables = () => {
  const output = {
    ':root': {},
    '[data-theme="dark"]': {},
  }

  Object.keys(colors.themedVariables.light).forEach((category) => {
    Object.keys(colors.themedVariables.light[category]).forEach((colorName) => {
      const variableName = `--${category}-${colorName}`
      const reference = colors.themedVariables.light[category][colorName]
      output[':root'][variableName] = resolveColorReference(reference)
    })
  })

  Object.keys(colors.themedVariables.dark).forEach((category) => {
    Object.keys(colors.themedVariables.dark[category]).forEach((colorName) => {
      const variableName = `--${category}-${colorName}`
      const reference = colors.themedVariables.dark[category][colorName]
      output['[data-theme="dark"]'][variableName] =
        resolveColorReference(reference)
    })
  })

  Object.keys(colors.lightMode).forEach((color) => {
    Object.keys(colors.lightMode[color]).forEach((shade) => {
      const variableName = `--${color}-${shade}`
      output[':root'][variableName] = colors.lightMode[color][shade]
    })
  })

  Object.keys(colors.darkMode).forEach((color) => {
    Object.keys(colors.darkMode[color]).forEach((shade) => {
      const variableName = `--dark-${color}-${shade}`
      output['[data-theme="dark"]'][variableName] =
        colors.darkMode[color][shade]
    })
  })

  return output
}

const cssVars = generateCSSVariables()

const lines = []
const push = (line = '') => lines.push(line)
const pushDecl = (key, value) => lines.push(`  ${key}: ${value};`)
const pushThemeComment = (text) => lines.push(`  /* ${text} */`)

push('@import "../src/fonts/Inter/inter.css";')
push('@import "tailwindcss";')
push('@plugin "@tailwindcss/forms";')
push('@plugin "@tailwindcss/typography";')
push('')

push('@theme {')
pushThemeComment('color: neutral')
Object.entries(colors.neutral).forEach(([name, val]) => {
  pushDecl(`--color-${name}`, val)
})

Object.entries(colors.lightMode).forEach(([color, shades]) => {
  push('')
  pushThemeComment(`color: ${color}`)
  Object.entries(shades).forEach(([shade, val]) => {
    pushDecl(`--color-${color}-${shade}`, val)
  })
})

Object.entries(colors.darkMode).forEach(([color, shades]) => {
  push('')
  pushThemeComment(`color: dark-${color}`)
  Object.entries(shades).forEach(([shade, val]) => {
    pushDecl(`--color-dark-${color}-${shade}`, val)
  })
})

push('')
pushThemeComment('color: overlay white')
Object.entries(colors.overlay.white).forEach(([shade, val]) => {
  pushDecl(`--color-white-overlay-${shade}`, val)
})

push('')
pushThemeComment('color: overlay black')
Object.entries(colors.overlay.black).forEach(([shade, val]) => {
  pushDecl(`--color-black-overlay-${shade}`, val)
})

Object.entries(colors.themedVariables.light).forEach(([group, vars]) => {
  if (group === 'surface' || group === 'ink' || group === 'outline') {
    return
  }
  push('')
  pushThemeComment(`color: ${group}`)
  Object.keys(vars).forEach((name) => {
    pushDecl(`--color-${group}-${name}`, `var(--${group}-${name})`)
  })
})

push('')
pushThemeComment('surface tokens')
Object.keys(colors.themedVariables.light.surface).forEach((name) => {
  const lightRef = colors.themedVariables.light.surface[name]
  const darkRef = colors.themedVariables.dark.surface[name]
  const lightToken = resolveColorToken(lightRef)
  const darkToken = resolveColorToken(darkRef)
  pushDecl(`--surface-${name}`, `light-dark(${lightToken}, ${darkToken})`)
})

push('')
pushThemeComment('ink tokens')
Object.keys(colors.themedVariables.light.ink).forEach((name) => {
  const lightRef = colors.themedVariables.light.ink[name]
  const darkRef = colors.themedVariables.dark.ink[name]
  const lightToken = resolveColorToken(lightRef)
  const darkToken = resolveColorToken(darkRef)
  pushDecl(`--ink-${name}`, `light-dark(${lightToken}, ${darkToken})`)
})

push('')
pushThemeComment('outline tokens')
Object.keys(colors.themedVariables.light.outline).forEach((name) => {
  const lightRef = colors.themedVariables.light.outline[name]
  const darkRef = colors.themedVariables.dark.outline[name]
  const lightToken = resolveColorToken(lightRef)
  const darkToken = resolveColorToken(darkRef)
  pushDecl(`--outline-${name}`, `light-dark(${lightToken}, ${darkToken})`)
})

push('')
pushThemeComment('defaults')
pushDecl('--color-border', 'var(--outline-gray-1)')
pushDecl('--default-ring-width', '3px')
pushDecl('--default-ring-color', 'var(--color-blue-500)')

push('')
pushThemeComment('border radius')
pushDecl('--radius-none', '0px')
pushDecl('--radius-sm', '0.25rem')
pushDecl('--radius', '0.5rem')
pushDecl('--radius-md', '0.625rem')
pushDecl('--radius-lg', '0.75rem')
pushDecl('--radius-xl', '1rem')
pushDecl('--radius-2xl', '1.25rem')
pushDecl('--radius-full', '9999px')

push('')
pushThemeComment('shadows')
pushDecl('--shadow-sm', '0px 1px 2px rgba(0, 0, 0, 0.1)')
pushDecl(
  '--shadow',
  '0px 0px 1px rgba(0, 0, 0, 0.45), 0px 1px 2px rgba(0, 0, 0, 0.1)',
)
pushDecl(
  '--shadow-md',
  '0px 0px 1px rgba(0, 0, 0, 0.12), 0px 0.5px 2px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.16)',
)
pushDecl(
  '--shadow-lg',
  '0px 0px 1px rgba(0, 0, 0, 0.35), 0px 6px 8px -4px rgba(0, 0, 0, 0.1)',
)
pushDecl(
  '--shadow-xl',
  '0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)',
)
pushDecl(
  '--shadow-2xl',
  '0px 0px 1px rgba(0, 0, 0, 0.2), 0px 1px 3px rgba(0, 0, 0, 0.05), 0px 10px 24px -3px rgba(0, 0, 0, 0.1)',
)
pushDecl('--shadow-none', 'none')

const text = [
  ['2xs', '11px', '1.15', '0.01em', '420'],
  ['xs', '12px', '1.15', '0.02em', '420'],
  ['sm', '13px', '1.15', '0.02em', '420'],
  ['base', '14px', '1.15', '0.02em', '420'],
  ['lg', '16px', '1.15', '0.02em', '400'],
  ['xl', '18px', '1.15', '0.01em', '400'],
  ['2xl', '20px', '1.15', '0.01em', '400'],
  ['3xl', '24px', '1.15', '0.005em', '400'],
  ['p-2xs', '11px', '1.6', '0.01em', '420'],
  ['p-xs', '12px', '1.6', '0.02em', '420'],
  ['p-sm', '13px', '1.5', '0.02em', '420'],
  ['p-base', '14px', '1.5', '0.02em', '420'],
  ['p-lg', '16px', '1.5', '0.02em', '400'],
  ['p-xl', '18px', '1.42', '0.01em', '400'],
  ['p-2xl', '20px', '1.38', '0.01em', '400'],
  ['p-3xl', '24px', '1.2', '0.005em', '400'],
]

push('')
pushThemeComment('font size')
text.forEach(([name, size, line, ls, fw]) => {
  pushDecl(`--text-${name}`, size)
  pushDecl(`--text-${name}--line-height`, line)
  pushDecl(`--text-${name}--letter-spacing`, ls)
  pushDecl(`--text-${name}--font-weight`, fw)
})

const spacings = {
  '4-5': '1.125rem',
  '5-5': '1.375rem',
  '6-5': '1.625rem',
  '7-5': '1.875rem',
  '8-5': '2.125rem',
  '9-5': '2.375rem',
  '10-5': '2.625rem',
  '11-5': '2.875rem',
  '12-5': '3.125rem',
  13: '3.25rem',
  '13-5': '3.375rem',
  '14-5': '3.625rem',
  15: '3.75rem',
  '15-5': '3.875rem',
}
push('')
pushThemeComment('spacing')
Object.entries(spacings).forEach(([k, v]) => {
  pushDecl(`--spacing-${k}`, v)
})

push('')
pushThemeComment('sizes')
pushDecl('--width-3-5', '0.875rem')
pushDecl('--width-112', '28rem')
pushDecl('--width-wizard', '650px')
pushDecl('--height-3-5', '0.875rem')
pushDecl('--min-width-40', '10rem')
pushDecl('--min-width-50', '18rem')
pushDecl('--max-height-52', '13rem')

push('')
pushThemeComment('breakpoints')
pushDecl('--breakpoint-sm', '640px')
pushDecl('--breakpoint-md', '768px')
pushDecl('--breakpoint-lg', '1024px')
pushDecl('--breakpoint-xl', '1280px')

push('}')
push('')

push('/* functional surface utilities */')
push('/* prettier-ignore */')
push('@utility bg-surface-* {')
push('  background-color: --value(--surface-*);')
push('}')
push('/* prettier-ignore */')
push('@utility fill-surface-* {')
push('  fill: --value(--surface-*);')
push('}')
push('')

push('/* functional ink utilities */')
push('/* prettier-ignore */')
push('@utility text-ink-* {')
push('  color: --value(--ink-*);')
push('}')
push('/* prettier-ignore */')
push('@utility fill-ink-* {')
push('  fill: --value(--ink-*);')
push('}')
push('/* prettier-ignore */')
push('@utility stroke-ink-* {')
push('  stroke: --value(--ink-*);')
push('}')
push('/* prettier-ignore */')
push('@utility placeholder-ink-* {')
push('  &::placeholder { color: --value(--ink-*); }')
push('}')
push('')

push('/* functional outline utilities */')
push('/* prettier-ignore */')
push('@utility border-outline-* {')
push('  border-color: --value(--outline-*);')
push('}')
push('/* prettier-ignore */')
push('@utility ring-outline-* {')
push('  --tw-ring-color: --value(--outline-*);')
push('}')
push('/* prettier-ignore */')
push('@utility divide-outline-* {')
push('  --tw-divide-color: --value(--outline-*);')
push('}')

const writeVars = (selector, obj) => {
  lines.push(`  ${selector} {`)
  Object.entries(obj).forEach(([key, val]) => {
    lines.push(`    ${key}: ${val};`)
  })
  lines.push('  }')
}

push('@layer base {')
writeVars(':root', cssVars[':root'])
writeVars('[data-theme="dark"]', cssVars['[data-theme="dark"]'])
lines.push('  *, ::after, ::before, ::backdrop, ::file-selector-button {')
lines.push('    border-color: var(--color-gray-200, currentColor);')
lines.push('  }')
lines.push('  html {')
lines.push(
  '    font-family: InterVar, var(--font-sans, ui-sans-serif, system-ui);',
)
lines.push('    font-optical-sizing: auto;')
lines.push('  }')
lines.push('  html, body, button, p, span, div {')
lines.push("    font-variation-settings: 'opsz' 24;")
lines.push('    -webkit-font-smoothing: antialiased;')
lines.push('    -moz-osx-font-smoothing: grayscale;')
lines.push('  }')
lines.push('  select {')
lines.push(
  '    background-image: url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="%237C7C7C" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" aria-hidden="true" viewBox="0 0 24 24" ><path d="m6 9 6 6 6-6" /></svg>\');',
)
lines.push('    background-size: 1.13em;')
lines.push('    background-position: right 0.44rem center;')
lines.push('  }')
lines.push('}')
lines.push('')

lines.push('@layer components {')
lines.push('  .form-input, .form-textarea, .form-select {')
lines.push(
  '    @apply h-7 rounded border border-(--surface-gray-2) bg-surface-gray-2 py-1.5 pl-2 pr-2 text-base text-ink-gray-8 placeholder-ink-gray-4 transition-colors hover:border-outline-gray-modals hover:bg-surface-gray-3 focus:border-outline-gray-4 focus:bg-surface-white focus:shadow-sm focus:ring-0 focus-visible:ring-2 focus-visible:ring-outline-gray-3;',
)
lines.push('  }')
lines.push('  .form-checkbox {')
lines.push(
  '    @apply rounded-md bg-surface-gray-2 text-ink-blue-2 focus:ring-0 focus-visible:ring-1;',
)
lines.push('  }')
lines.push("  [data-theme='dark'] [type='checkbox']:checked {")
lines.push(
  "    background-image: url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='%230F0F0F' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\");",
)
lines.push('  }')
lines.push("  [data-theme='dark'] img {")
lines.push('    filter: brightness(.8) contrast(1.2);')
lines.push('  }')
lines.push('}')

console.log(lines.join('\n'))
