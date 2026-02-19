import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Це ваш файл з логікою дашборду

// Знаходимо елемент з id="root" у вашому index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// Рендеримо наш додаток
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
