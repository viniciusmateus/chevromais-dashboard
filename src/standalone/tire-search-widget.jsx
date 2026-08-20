import React from 'react';
import ReactDOM from 'react-dom/client';
import TyreSearch from '../components/LojaVirtual/TireSearch';

// Importa o CSS compilado
import widgetStyles from './widget.css?inline';

function initTireSearch() {
  const container = document.getElementById('tire-search-widget');

  if (container) {
    // Reutiliza ou cria o Shadow Root
    const shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '';

    // Injeta a folha de estilos no Shadow DOM
    const styleTag = document.createElement('style');
    styleTag.textContent = widgetStyles;
    shadowRoot.appendChild(styleTag);

    // Div raiz do React
    const reactContainer = document.createElement('div');
    reactContainer.id = 'widget-root';
    shadowRoot.appendChild(reactContainer);

    // Renderiza a aplicação
    const root = ReactDOM.createRoot(reactContainer);
    root.render(React.createElement(TyreSearch));
  } else {
    console.warn('Container #tire-search-widget não foi encontrado na página.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTireSearch);
} else {
  initTireSearch();
}