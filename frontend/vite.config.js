import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss({
      theme: {
        extend: {
          colors: {
            primary: '#ff6b6b',
            'background-light': '#f8f5f5',
            'background-dark': '#230f0f',
          },
          borderRadius: {
            DEFAULT: '0.25rem',
            lg: '0.5rem',
            xl: '0.75rem',
            full: '9999px',
          },
        },
      },
    }),
  ],
})
