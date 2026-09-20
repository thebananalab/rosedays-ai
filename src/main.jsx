import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'lenis/dist/lenis.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <App />
  </BrowserRouter>
)
