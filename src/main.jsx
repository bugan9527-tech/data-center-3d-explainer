import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Drei Html creates secondary DOM roots; avoid StrictMode's double-unmount cycle.
createRoot(document.getElementById('root')).render(<App />);
