import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { injectTokens } from '../tokens/token-loader'
import './index.css'
import App from './App.tsx'

injectTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
