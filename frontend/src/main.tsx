import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// prime react theme
import 'primereact/resources/primereact.min.css';                  //core css
import 'primeicons/primeicons.css';                                //icons
import './themeOverrides.css';                                     //brand color + control sizing overrides
import lightThemeUrl from 'primereact/resources/themes/lara-light-blue/theme.css?url';
import darkThemeUrl from 'primereact/resources/themes/lara-dark-blue/theme.css?url';
import { loadThemeFromStorage } from './context/ThemeContextDefinition';

// Set the PrimeReact theme stylesheet + data-theme attribute before the first paint, so a
// saved dark-mode preference doesn't flash light on reload (ThemeContextProvider takes over
// managing both once React mounts - see its useEffect).
const initialTheme = loadThemeFromStorage();
document.documentElement.setAttribute('data-theme', initialTheme);
const primeThemeLink = document.createElement('link');
primeThemeLink.id = 'prime-theme-link';
primeThemeLink.rel = 'stylesheet';
primeThemeLink.href = initialTheme === 'dark' ? darkThemeUrl : lightThemeUrl;
document.head.appendChild(primeThemeLink);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
