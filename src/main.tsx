import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import { listenForErrors } from './shared/lib';

listenForErrors();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
