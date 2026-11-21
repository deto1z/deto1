import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Casting from './Casting.jsx';
import './styles.css';
const casting = new URLSearchParams(location.search).has('casting');
ReactDOM.createRoot(document.getElementById('root')).render(casting ? <Casting /> : <App />);
