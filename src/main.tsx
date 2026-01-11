import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useThemeStore, applyTheme } from './store/themeStore'

// Apply initial theme
const initialTheme = useThemeStore.getState().theme
applyTheme(initialTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
