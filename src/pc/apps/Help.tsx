import React, { useState } from 'react';

const TOPICS: [string, string][] = [
  ['Welcome to Windows 98', 'This is the family computer on the desk in the corner. Double-click the icons on the desktop to open things, or use the Start button. Press Esc any time to step back from the desk.'],
  ['Playing Pinball', 'Hold Space and let go to launch the ball. Z (or Left Shift) works the left flipper and / (or Right Shift) the right one. X bumps the table, but bump it three times quickly and it TILTS. Light R-U-N at the top to raise your bonus multiplier, and drop all three orange targets for a big bonus. The purple hole is a hyperspace jump.'],
  ['Playing Minesweeper', 'Click a square to dig. A number tells you how many mines touch that square. Right-click to put down a flag. Click a number whose flags are all down to clear around it.'],
  ['Using WordArt', 'Open WordArt from the desktop, pick a style from the gallery, type your words and press OK. Drag it to move it, double-click to change the words, and use the WordArt toolbar to bend it into an arch, a wave or a circle.'],
  ['Using Paint', 'Left click paints with the front colour, right click with the back colour. File > Set As Wallpaper puts your picture on the desktop.'],
  ['Media Player', 'Click the picture to flip through the visualizations. File opens songs from your own computer.'],
  ['The Internet', 'Internet Explorer dials up first (keep everyone off the phone). Real addresses open as they looked in 1998, saved by the Internet Archive.'],
  ['Shutting down', 'Start > Shut Down. Pick Restart in MS-DOS mode for a C:\\> prompt; type WIN to come back.'],
];

/** Windows Help: a contents list and the topic. */
export function Help() {
  const [topic, setTopic] = useState(0);
  return (
    <div className="help">
      <ul className="tree-view help-list">
        {TOPICS.map(([t], i) => (
          <li key={t} className={topic === i ? 'picked' : ''} onClick={() => setTopic(i)}>
            📖 {t}
          </li>
        ))}
      </ul>
      <div className="help-body">
        <h3>{TOPICS[topic][0]}</h3>
        <p>{TOPICS[topic][1]}</p>
      </div>
    </div>
  );
}
