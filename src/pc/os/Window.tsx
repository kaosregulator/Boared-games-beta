import React, { useRef } from 'react';
import { Icon } from './icons';
import { closeWindow, focusWindow, minimizeWindow, SCREEN_H, SCREEN_W, TASKBAR_H, updateWindow, useWm, type WinState } from './wm';

interface Props {
  win: WinState;
  resizable?: boolean;
  /** Dialogs and games have no maximize button. */
  maximizable?: boolean;
  minimizable?: boolean;
  children: React.ReactNode;
  /** Help "?" button on the title bar, like dialogs had. */
  help?: boolean;
  onClose?: () => void;
}

/**
 * One window: a title bar you can drag, minimize/maximize/close, and a
 * resize grip. The frame and bevels come from 98.css.
 */
export function Window({ win, resizable = true, maximizable = true, minimizable = true, help = false, children, onClose }: Props) {
  const { focused } = useWm();
  const active = focused === win.id;
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const size = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  if (win.minimized) return null;

  const rect = win.maximized ? { x: -3, y: -3, w: SCREEN_W + 6, h: SCREEN_H - TASKBAR_H + 6 } : win;

  const close = () => {
    if (onClose) onClose();
    else closeWindow(win.id);
  };

  const startDrag = (e: React.PointerEvent) => {
    if (win.maximized || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const x = Math.round(Math.max(-win.w + 60, Math.min(SCREEN_W - 40, e.clientX - drag.current.dx)));
    const y = Math.round(Math.max(0, Math.min(SCREEN_H - TASKBAR_H - 20, e.clientY - drag.current.dy)));
    updateWindow(win.id, { x, y });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const startSize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    size.current = { x: e.clientX, y: e.clientY, w: win.w, h: win.h };
  };
  const moveSize = (e: React.PointerEvent) => {
    if (!size.current) return;
    updateWindow(win.id, {
      w: Math.max(200, size.current.w + e.clientX - size.current.x),
      h: Math.max(120, size.current.h + e.clientY - size.current.y),
    });
  };

  return (
    <div
      className="window"
      data-win={win.app}
      style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z, display: 'flex', flexDirection: 'column' }}
      onPointerDownCapture={() => {
        if (!active) focusWindow(win.id);
      }}
    >
      <div
        className={`title-bar${active ? '' : ' inactive'}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onDoubleClick={() => maximizable && resizable && updateWindow(win.id, { maximized: !win.maximized })}
      >
        <div className="title-bar-text" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Icon name={win.icon} size={16} />
          <span>{win.title}</span>
        </div>
        <div className="title-bar-controls">
          {help && <button aria-label="Help" />}
          {minimizable && <button aria-label="Minimize" onClick={() => minimizeWindow(win.id)} />}
          {maximizable && <button aria-label={win.maximized ? 'Restore' : 'Maximize'} disabled={!resizable} onClick={() => updateWindow(win.id, { maximized: !win.maximized })} />}
          <button aria-label="Close" onClick={close} />
        </div>
      </div>
      <div className="window-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: 2 }}>
        {children}
      </div>
      {resizable && !win.maximized && (
        <div
          className="resize-grip"
          data-cursor="resize"
          onPointerDown={startSize}
          onPointerMove={moveSize}
          onPointerUp={() => (size.current = null)}
        />
      )}
    </div>
  );
}

export interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  divider?: boolean;
}

/** The File / Edit / Help bar under the title, with drop-down menus. */
export function MenuBar({ menus }: { menus: { label: string; items: MenuItem[] }[] }) {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div className="menubar" onPointerLeave={() => setOpen(null)}>
      {menus.map((m, i) => (
        <div key={m.label} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`menubar-item${open === i ? ' open' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            onPointerEnter={() => open !== null && setOpen(i)}
          >
            <u>{m.label[0]}</u>
            {m.label.slice(1)}
          </button>
          {open === i && (
            <div className="dropdown">
              {m.items.map((it, j) =>
                it.divider ? (
                  <div key={j} className="dropdown-divider" />
                ) : (
                  <button
                    key={j}
                    type="button"
                    className="dropdown-item"
                    disabled={it.disabled}
                    onClick={() => {
                      setOpen(null);
                      it.onClick?.();
                    }}
                  >
                    <span className="check">{it.checked ? '✓' : ''}</span>
                    {it.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
