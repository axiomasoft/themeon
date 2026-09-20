import { defineTheme } from '@themeon/core'
import { themeon } from '@themeon/vite'

const theme = defineTheme({
  base: {
    color: { action: { primary: 'oklch(0.55 0.15 255)' } },
    bg: { page: 'oklch(1 0 0)' },
  },
})

export default {
  plugins: [themeon({ theme, artifacts: true })],
}
