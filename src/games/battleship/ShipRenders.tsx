import React from 'react';
import { ShipType } from '../../types';

interface ShipRenderProps {
  type: ShipType;
  orientation?: 'horizontal' | 'vertical';
  cellSize?: number;
  sunk?: boolean;
  hits?: number;
  className?: string;
}

// -------------------------------------------------------------
// REALISTIC TOP-DOWN NAVAL WARSHIPS FOR OCEAN BOARD DEPLOYMENT
// -------------------------------------------------------------

export const RealisticWarship: React.FC<ShipRenderProps> = ({
  type,
  orientation = 'horizontal',
  cellSize = 36,
  sunk = false,
  className = ''
}) => {
  const isVert = orientation === 'vertical';

  switch (type) {
    case 'carrier': {
      // 5 Cells: Nimitz / Gerald R. Ford Class Supercarrier
      const len = cellSize * 5;
      const wid = cellSize * 0.96;
      return (
        <div
          className={`absolute pointer-events-none z-10 transition-all duration-300 ${className} ${
            sunk ? 'opacity-70 filter saturate-50 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'drop-shadow-2xl'
          }`}
          style={{
            width: isVert ? `${wid}px` : `${len}px`,
            height: isVert ? `${len}px` : `${wid}px`,
            transform: isVert ? 'rotate(90deg)' : 'none',
            transformOrigin: `${cellSize / 2}px ${cellSize / 2}px`
          }}
        >
          {/* Water Wake / Foam Shadow */}
          <div className="absolute -inset-1 rounded-full bg-cyan-400/10 blur-sm pointer-events-none" />

          <svg viewBox="0 0 200 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="carrierHull" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="deckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="glowSunk" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Sunk Red Underglow if destroyed */}
            {sunk && <path d="M12 4 L190 4 Q198 20 190 36 L12 36 Q2 20 12 4 Z" fill="url(#glowSunk)" />}

            {/* Main Supercarrier Hull with Realistic Bow/Stern contours */}
            <path
              d="M12 4 L185 4 Q198 20 185 36 L12 36 Q3 20 12 4 Z"
              fill="url(#carrierHull)"
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Angled Flight Deck (Charcoal Non-Skid Steel) */}
            <path
              d="M16 6 L182 6 Q192 20 182 34 L16 34 Q8 20 16 6 Z"
              fill="url(#deckGrad)"
              stroke="#475569"
              strokeWidth="1"
            />

            {/* Main Runway Centerline (Yellow & White Dashed Markings) */}
            <line x1="22" y1="20" x2="170" y2="20" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="6 4" />
            <line x1="24" y1="12" x2="160" y2="12" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="24" y1="28" x2="160" y2="28" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />

            {/* Angled Recovery Landing Strip (Red line) */}
            <line x1="30" y1="32" x2="120" y2="8" stroke="#ef4444" strokeWidth="1.2" />
            {/* Arresting Wires */}
            <line x1="45" y1="16" x2="45" y2="32" stroke="#cbd5e1" strokeWidth="0.8" />
            <line x1="55" y1="16" x2="55" y2="32" stroke="#cbd5e1" strokeWidth="0.8" />
            <line x1="65" y1="16" x2="65" y2="32" stroke="#cbd5e1" strokeWidth="0.8" />

            {/* Island Superstructure (Starboard Command Bridge & Radar Mast) */}
            <rect x="125" y="4" width="34" height="9" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="150" cy="8.5" r="2.5" fill="#38bdf8" />
            <rect x="132" y="6" width="6" height="5" rx="1" fill="#475569" />
            <line x1="150" y1="8.5" x2="150" y2="3" stroke="#38bdf8" strokeWidth="1.2" />

            {/* Catapult 1 & 2 Shuttle Tracks */}
            <line x1="130" y1="12" x2="175" y2="12" stroke="#38bdf8" strokeWidth="1" />
            <line x1="130" y1="16" x2="175" y2="16" stroke="#38bdf8" strokeWidth="1" />

            {/* Fighter Jets on Deck (F/A-18 Super Hornet silhouettes) */}
            {/* Jet 1 */}
            <path d="M48 11 L54 7 L51 11 L54 15 Z" fill="#94a3b8" stroke="#334155" strokeWidth="0.5" />
            <circle cx="51" cy="11" r="1" fill="#38bdf8" />
            {/* Jet 2 */}
            <path d="M80 11 L86 7 L83 11 L86 15 Z" fill="#94a3b8" stroke="#334155" strokeWidth="0.5" />
            <circle cx="83" cy="11" r="1" fill="#38bdf8" />
            {/* Jet 3 */}
            <path d="M105 27 L111 23 L108 27 L111 31 Z" fill="#94a3b8" stroke="#334155" strokeWidth="0.5" />
            {/* Jet 4 Ready on Catapult */}
            <path d="M165 12 L171 8 L168 12 L171 16 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />

            {/* Hull Stern Number 68 */}
            <text x="18" y="22" fill="#64748b" fontSize="7" fontWeight="bold" fontFamily="monospace">
              68
            </text>
          </svg>
        </div>
      );
    }

    case 'battleship': {
      // 4 Cells: Iowa / Yamato Class Heavy Battleship
      const len = cellSize * 4;
      const wid = cellSize * 0.92;
      return (
        <div
          className={`absolute pointer-events-none z-10 transition-all duration-300 ${className} ${
            sunk ? 'opacity-70 filter saturate-50 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'drop-shadow-2xl'
          }`}
          style={{
            width: isVert ? `${wid}px` : `${len}px`,
            height: isVert ? `${len}px` : `${wid}px`,
            transform: isVert ? 'rotate(90deg)' : 'none',
            transformOrigin: `${cellSize / 2}px ${cellSize / 2}px`
          }}
        >
          <div className="absolute -inset-1 rounded-full bg-cyan-400/10 blur-sm pointer-events-none" />

          <svg viewBox="0 0 160 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bbHull" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="bbDeck" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>

            {/* Battleship Armored Tapered Hull */}
            <path
              d="M10 8 L142 8 Q158 20 142 32 L10 32 Q2 20 10 8 Z"
              fill="url(#bbHull)"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Teak/Steel Armored Deck */}
            <path
              d="M14 10 L138 10 Q150 20 138 30 L14 30 Q7 20 14 10 Z"
              fill="url(#bbDeck)"
              stroke="#334155"
            />

            {/* Bow Triple Heavy Gun Turret 1 (16-inch 50 cal) */}
            <circle cx="128" cy="20" r="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="128" y1="17.5" x2="148" y2="17.5" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="128" y1="20" x2="150" y2="20" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="128" y1="22.5" x2="148" y2="22.5" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />

            {/* Forward Turret 2 (Elevated Superfiring) */}
            <circle cx="106" cy="20" r="6" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="106" y1="18" x2="124" y2="18" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="106" y1="20" x2="125" y2="20" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="106" y1="22" x2="124" y2="22" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />

            {/* Armored Conning Tower & Citadel Superstructure */}
            <rect x="66" y="13" width="28" height="14" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="80" cy="20" r="3.5" fill="#38bdf8" />
            <line x1="80" y1="13" x2="80" y2="7" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="75" y1="7" x2="85" y2="7" stroke="#38bdf8" strokeWidth="1.5" />

            {/* Smokestack Funnels */}
            <rect x="52" y="14" width="10" height="12" rx="2" fill="#1e293b" stroke="#64748b" />
            <circle cx="57" cy="20" r="2.5" fill="#0f172a" />

            {/* Aft Heavy Gun Turret 3 */}
            <circle cx="34" cy="20" r="6.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="34" y1="18" x2="15" y2="18" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="34" y1="20" x2="13" y2="20" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="34" y1="22" x2="15" y2="22" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />

            {/* Stern Aircraft Crane / Helipad */}
            <circle cx="18" cy="20" r="3" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
            <text x="16" y="22" fill="#94a3b8" fontSize="4" fontWeight="bold">H</text>
          </svg>
        </div>
      );
    }

    case 'cruiser': {
      // 3 Cells: Ticonderoga Class Aegis Guided Missile Cruiser
      const len = cellSize * 3;
      const wid = cellSize * 0.88;
      return (
        <div
          className={`absolute pointer-events-none z-10 transition-all duration-300 ${className} ${
            sunk ? 'opacity-70 filter saturate-50 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'drop-shadow-2xl'
          }`}
          style={{
            width: isVert ? `${wid}px` : `${len}px`,
            height: isVert ? `${len}px` : `${wid}px`,
            transform: isVert ? 'rotate(90deg)' : 'none',
            transformOrigin: `${cellSize / 2}px ${cellSize / 2}px`
          }}
        >
          <div className="absolute -inset-1 rounded-full bg-cyan-400/10 blur-sm pointer-events-none" />

          <svg viewBox="0 0 120 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="crHull" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Cruiser Sleek Hydrodynamic Hull */}
            <path
              d="M10 8 L108 8 Q118 18 108 28 L10 28 Q2 18 10 8 Z"
              fill="url(#crHull)"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Deck */}
            <path d="M14 10 L104 10 Q112 18 104 26 L14 26 Q7 18 14 10 Z" fill="#334155" />

            {/* Forward 5-inch/54 caliber Naval Gun */}
            <circle cx="96" cy="18" r="5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
            <line x1="96" y1="18" x2="112" y2="18" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />

            {/* Forward Mk 41 Vertical Launch System (VLS 64-Cell Missile Silo Grid) */}
            <rect x="80" y="13" width="9" height="10" rx="1" fill="#0f172a" stroke="#ef4444" strokeWidth="0.8" />
            <line x1="84.5" y1="13" x2="84.5" y2="23" stroke="#ef4444" strokeWidth="0.6" />

            {/* Aegis Superstructure with Phased-Array Radar Faces */}
            <rect x="48" y="11" width="26" height="14" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="61" cy="18" r="3" fill="#38bdf8" />
            <line x1="61" y1="11" x2="61" y2="5" stroke="#38bdf8" strokeWidth="1.4" />

            {/* Harpoon Anti-Ship Missile Launchers (Quad Canisters) */}
            <rect x="34" y="13" width="8" height="10" rx="1" fill="#1e293b" stroke="#94a3b8" />
            <line x1="34" y1="15" x2="42" y2="15" stroke="#ef4444" strokeWidth="1" />
            <line x1="34" y1="21" x2="42" y2="21" stroke="#ef4444" strokeWidth="1" />

            {/* Stern Helipad */}
            <rect x="16" y="12" width="12" height="12" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="22" cy="18" r="4" stroke="#e2e8f0" strokeWidth="0.8" />
            <text x="20" y="20.5" fill="#e2e8f0" fontSize="5" fontWeight="bold">H</text>
          </svg>
        </div>
      );
    }

    case 'submarine': {
      // 3 Cells: Virginia / Los Angeles Class Fast Attack Nuclear Submarine
      const len = cellSize * 3;
      const wid = cellSize * 0.82;
      return (
        <div
          className={`absolute pointer-events-none z-10 transition-all duration-300 ${className} ${
            sunk ? 'opacity-70 filter saturate-50 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'drop-shadow-2xl'
          }`}
          style={{
            width: isVert ? `${wid}px` : `${len}px`,
            height: isVert ? `${len}px` : `${wid}px`,
            transform: isVert ? 'rotate(90deg)' : 'none',
            transformOrigin: `${cellSize / 2}px ${cellSize / 2}px`
          }}
        >
          <div className="absolute -inset-1 rounded-full bg-cyan-400/15 blur-sm pointer-events-none" />

          <svg viewBox="0 0 120 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="subHull" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
            </defs>

            {/* Torpedo Tear-Drop Hydrodynamic Hull */}
            <path
              d="M12 9 L104 9 Q116 18 104 27 L12 27 Q4 18 12 9 Z"
              fill="url(#subHull)"
              stroke="#0284c7"
              strokeWidth="1.8"
            />

            {/* Conning Tower (Sail with Hydroplanes) */}
            <rect x="52" y="10" width="20" height="16" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
            {/* Periscopes / Photonic Masts */}
            <line x1="60" y1="10" x2="60" y2="4" stroke="#38bdf8" strokeWidth="1.4" />
            <circle cx="60" cy="3.5" r="1.5" fill="#38bdf8" />
            <line x1="64" y1="10" x2="64" y2="6" stroke="#38bdf8" strokeWidth="1.2" />

            {/* Bow Active Sonar Sphere Dome */}
            <circle cx="106" cy="18" r="4.5" fill="#0369a1" opacity="0.6" />
            {/* Torpedo Tube Shutters */}
            <circle cx="104" cy="14" r="1.5" fill="#ef4444" />
            <circle cx="104" cy="22" r="1.5" fill="#ef4444" />

            {/* Stern Shrouded Propulsor / Screw */}
            <path d="M10 13 L2 18 L10 23 Z" fill="#38bdf8" stroke="#0284c7" />
            {/* Rudder & Stern Planes */}
            <path d="M16 7 L22 9 L16 11 Z" fill="#334155" />
            <path d="M16 25 L22 27 L16 29 Z" fill="#334155" />

            {/* Hull Acoustic Tiles Grid Lines */}
            <line x1="30" y1="11" x2="30" y2="25" stroke="#334155" strokeWidth="0.8" />
            <line x1="42" y1="11" x2="42" y2="25" stroke="#334155" strokeWidth="0.8" />
            <line x1="84" y1="11" x2="84" y2="25" stroke="#334155" strokeWidth="0.8" />
          </svg>
        </div>
      );
    }

    case 'destroyer': {
      // 2 Cells: Arleigh Burke Guided Missile Destroyer
      const len = cellSize * 2;
      const wid = cellSize * 0.84;
      return (
        <div
          className={`absolute pointer-events-none z-10 transition-all duration-300 ${className} ${
            sunk ? 'opacity-70 filter saturate-50 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'drop-shadow-2xl'
          }`}
          style={{
            width: isVert ? `${wid}px` : `${len}px`,
            height: isVert ? `${len}px` : `${wid}px`,
            transform: isVert ? 'rotate(90deg)' : 'none',
            transformOrigin: `${cellSize / 2}px ${cellSize / 2}px`
          }}
        >
          <div className="absolute -inset-1 rounded-full bg-cyan-400/10 blur-sm pointer-events-none" />

          <svg viewBox="0 0 80 34" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ddgHull" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Fast Planing Hull */}
            <path
              d="M8 8 L70 8 Q78 17 70 26 L8 26 Q2 17 8 8 Z"
              fill="url(#ddgHull)"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Deck */}
            <path d="M11 10 L66 10 Q72 17 66 24 L11 24 Q5 17 11 10 Z" fill="#334155" />

            {/* Bow Rapid-Fire 5-Inch Gun */}
            <circle cx="58" cy="17" r="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
            <line x1="58" y1="17" x2="72" y2="17" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />

            {/* Stealth Faceted Bridge & Mast */}
            <rect x="30" y="11" width="18" height="12" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="39" cy="17" r="2.5" fill="#38bdf8" />
            <line x1="39" y1="11" x2="39" y2="5" stroke="#38bdf8" strokeWidth="1.2" />

            {/* Stern Depth Charge / Torpedo Tubes */}
            <rect x="14" y="12" width="8" height="10" rx="1" fill="#1e293b" stroke="#ef4444" strokeWidth="0.8" />
            <circle cx="18" cy="15" r="1" fill="#ef4444" />
            <circle cx="18" cy="19" r="1" fill="#ef4444" />
          </svg>
        </div>
      );
    }

    default:
      return null;
  }
};

// -------------------------------------------------------------
// SIDE-PROFILE REALISTIC SILHOUETTE FOR THE FLEET STATUS PANEL
// -------------------------------------------------------------

export const ShipSilhouetteSideView: React.FC<{ type: ShipType; sunk?: boolean }> = ({ type, sunk = false }) => {
  return (
    <div className={`w-full h-8 flex items-center justify-center transition-all ${sunk ? 'opacity-40 grayscale' : ''}`}>
      {type === 'carrier' && (
        <svg viewBox="0 0 160 28" className="w-full h-full drop-shadow" fill="none">
          <path d="M10 14 L150 14 L142 22 L20 22 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          <rect x="12" y="11" width="140" height="3" fill="#1e293b" />
          <rect x="95" y="4" width="22" height="7" rx="1" fill="#334155" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="106" y1="4" x2="106" y2="1" stroke="#38bdf8" strokeWidth="1" />
          <line x1="20" y1="22" x2="142" y2="22" stroke="#0284c7" strokeWidth="1.5" />
        </svg>
      )}

      {type === 'battleship' && (
        <svg viewBox="0 0 130 28" className="w-full h-full drop-shadow" fill="none">
          <path d="M8 14 L122 14 L114 22 L16 22 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          {/* Main Turrets */}
          <rect x="94" y="9" width="14" height="5" rx="1" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="108" y1="11" x2="124" y2="11" stroke="#f1f5f9" strokeWidth="1.5" />
          <rect x="76" y="8" width="12" height="6" rx="1" fill="#1e293b" />
          <line x1="88" y1="10" x2="102" y2="10" stroke="#cbd5e1" strokeWidth="1.2" />
          {/* Bridge & Mast */}
          <rect x="48" y="5" width="20" height="9" rx="1" fill="#334155" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="58" y1="5" x2="58" y2="2" stroke="#38bdf8" strokeWidth="1" />
          {/* Rear Turret */}
          <rect x="22" y="9" width="14" height="5" rx="1" fill="#1e293b" />
          <line x1="22" y1="11" x2="8" y2="11" stroke="#cbd5e1" strokeWidth="1.4" />
        </svg>
      )}

      {type === 'cruiser' && (
        <svg viewBox="0 0 105 28" className="w-full h-full drop-shadow" fill="none">
          <path d="M8 15 L98 15 L90 22 L14 22 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          {/* Bow Gun */}
          <rect x="78" y="11" width="10" height="4" rx="1" fill="#1e293b" />
          <line x1="88" y1="13" x2="98" y2="13" stroke="#f8fafc" strokeWidth="1.4" />
          {/* Aegis Deckhouse */}
          <rect x="42" y="7" width="24" height="8" rx="1" fill="#334155" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="54" y1="7" x2="54" y2="3" stroke="#38bdf8" strokeWidth="1" />
          {/* Radar Antennas */}
          <circle cx="54" cy="3" r="1.5" fill="#38bdf8" />
        </svg>
      )}

      {type === 'submarine' && (
        <svg viewBox="0 0 95 28" className="w-full h-full drop-shadow" fill="none">
          <path d="M8 16 Q50 12 88 16 Q88 22 50 22 Q8 22 8 16 Z" fill="#1e293b" stroke="#0284c7" strokeWidth="1.2" />
          {/* Sail & Mast */}
          <rect x="42" y="9" width="16" height="7" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="50" y1="9" x2="50" y2="4" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="50" cy="3.5" r="1" fill="#38bdf8" />
          {/* Propeller */}
          <path d="M6 14 L2 16 L6 18 Z" fill="#38bdf8" />
        </svg>
      )}

      {type === 'destroyer' && (
        <svg viewBox="0 0 80 28" className="w-full h-full drop-shadow" fill="none">
          <path d="M6 15 L74 15 L68 22 L10 22 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          {/* Bow Gun */}
          <rect x="56" y="11" width="8" height="4" rx="1" fill="#1e293b" />
          <line x1="64" y1="13" x2="72" y2="13" stroke="#f8fafc" strokeWidth="1.2" />
          {/* Bridge */}
          <rect x="28" y="8" width="16" height="7" rx="1" fill="#334155" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="36" y1="8" x2="36" y2="4" stroke="#38bdf8" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// SEGMENTED HEALTH BAR (Exact match to screenshot)
// -------------------------------------------------------------

export const SegmentedHealthBar: React.FC<{ size: number; hits: number; sunk: boolean }> = ({
  size,
  hits,
  sunk
}) => {
  return (
    <div className="flex items-center gap-1 w-full max-w-[140px] mt-1">
      {Array.from({ length: size }, (_, i) => {
        const isHit = i < hits || sunk;
        return (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm border transition-all duration-300 ${
              isHit
                ? 'bg-rose-600/80 border-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                : 'bg-emerald-500 border-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
            }`}
          />
        );
      })}
    </div>
  );
};
