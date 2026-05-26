import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.jsx';

// Since App depends on Supabase, it might fail to render, but let's try to load it.
console.log('App loaded successfully');
