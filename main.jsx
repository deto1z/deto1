import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Importa el componente principal de tu aplicación
import './index.css'; // Importa tus estilos CSS globales (usado por Tailwind CSS)

// Obtiene el elemento raíz del DOM donde se montará la aplicación
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Renderiza el componente principal de tu aplicación (App) */}
    <App />
  </React.StrictMode>,
);
