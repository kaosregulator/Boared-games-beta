import React from 'react';

/**
 * The thank-you to the Internet Archive that rides along under its videos,
 * the time capsule cards and the title screen's music credits. No links, on
 * purpose: just the thanks and where to look to support them.
 */
export const ARCHIVE_THANKS =
  'A huge thank you to Brewster Kahle, founder of the Internet Archive, and the whole Internet Archive team for preserving these amazing pieces of history.';
export const ARCHIVE_SUPPORT = "If you'd like to support them, head over to their website.";
/** The short one for the TV, where there's only a thin strip under the picture. */
export const ARCHIVE_THANKS_SHORT = 'Thank you, Brewster Kahle & the Internet Archive team, for preserving this history';

export const HEART_RED = '#ef4444';

export function ArchiveThanks({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <p className={className} style={style}>
      <span style={{ color: HEART_RED }} aria-hidden>
        ♥
      </span>{' '}
      {ARCHIVE_THANKS} {ARCHIVE_SUPPORT}
    </p>
  );
}
