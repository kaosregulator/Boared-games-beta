import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Probe } from './dev/Probe';
import { PickProbe } from './dev/PickProbe';

const q = new URLSearchParams(location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {q.has('pick-probe') ? <PickProbe /> : q.has('probe') ? <Probe /> : <App />}
  </StrictMode>,
);
