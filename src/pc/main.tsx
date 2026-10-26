import React from 'react';
import { createRoot } from 'react-dom/client';
import '98.css';
import './pc.css';
import { Shell } from './os/Shell';
import { installClientErrorLog } from '../engine/log';

installClientErrorLog('pc');

/**
 * The family computer: a little Windows 98 that runs inside the monitor on
 * the desk (pc.html, framed into the room). It also opens on its own at
 * /pc.html?boot for testing.
 */
createRoot(document.getElementById('pc-root')!).render(<Shell />);
