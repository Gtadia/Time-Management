// We're going to use react (and react native) for the UI
// That means that we're gonna have to learn how to use Redux

// REMEMBER, the index.js folder can also go in the src file (just update the PATH accordingly)
    // So essentially, it can go anywhere as long as the file paths are corrected for it
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App.js';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App/>);
