/**
 * @file Punto di ingresso dell'applicazione React.
 * Si occupa di trovare l'elemento radice del DOM e di montare il componente
 * principale dell'applicazione, `App`, al suo interno.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
