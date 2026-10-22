import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { RealRoomScene, type LiveProp } from './RealRoomScene';
import { WalkController } from './WalkController';
import { ReachRaycaster, type Aimed } from './ReachRaycaster';
import { CaptureClock, TourCamera } from './TourCamera';
import { LAYOUT } from './roomLayout';
import { DESK_SLOTS, SHELF_SLOTS, SHELF_SLOTS_LOWER } from './videoRoom';
import { MemoryFlashCard } from './MemoryFlashCard';
import { propCardFor, type CardAction } from './propCards';
import { TamagotchiPlay } from '../devices/TamagotchiPlay';
import { RubikPlay } from '../devices/RubikPlay';
import { DeviceFocus } from './DeviceFocus';
import { DeviceOverlay } from './DeviceOverlay';
import { TvGlass } from '../tv/TvSet';
import { IntroCard } from './IntroCard';
import { neonGames } from './NeonGameWall';
import { GameBoySeat } from '../devices/GameBoySeat';
import { GameBoyGlass } from '../devices/GameBoyGlass';
import { DEVICE_FROM_PROP, type DeviceId } from './devices';
import { radio, useRadio } from '../radio/radioEngine';
import { RoomStudio } from './RoomStudio';
import { TouchHud } from './TouchHud';
import { AimReticle } from './AimReticle';
import { TouchGamepad } from '../devices/TouchGamepad';
import { aim, isTouchDevice, pad } from './input';
import { useTvStatus } from '../tv/tvBus';
import { TvRemote } from '../tv/TvRemote';
import { DeviceGestures } from '../devices/DeviceGestures';
import { insetsFor, resetView, setBig, setInsets, useViewRig, useViewport, viewRig } from '../devices/viewRig';
import { setGlassBig } from '../devices/GlassScreen';
import { enterFullscreen, exitFullscreen, useFullscreen } from './immersive';
import { ViewControls } from './ViewControls';
import { setWalkFov, setWalkZoom, useWalkView } from './walkView';
import { resumedSession, saveEngaged } from './session';
import { TABLE_GAMES, TableHudOverlay, type TableSession } from './table/TablePlay';
import { walkRig } from './WalkController';
import { TABLE_SEAT } from './roomLayout';
import { ANCHORS, anchorById, type Anchor } from './anchors';
import { deletePlacement, loadPlacements, savePlacement, type SavedPlacement } from './userPlacements';
import type { RoomMood } from './moods';

/**
 * `?tour=1` runs a hands-off dolly through the room and `?shot=N` parks the
 * camera on tour waypoint N. Both skip pointer lock so the room can be captured
 * and reviewed without a mouse.
 */
/** `?cam=x,y,z,lx,ly,lz` parks the camera anywhere, for capture scripts. */
function parseCam(raw: string | null) {
  if (!raw) return null;
  const n = raw.split(',').map(Number);
  if (n.length !== 6 || n.some(v => !Number.isFinite(v))) return null;
  return { at: [n[0], n[1], n[2]] as [number, number, number], look: [n[3], n[4], n[5]] as [number, number, number] };
}

function readCameraOverride() {
  if (typeof window === 'undefined') {
    return {
      tour: false,
      shot: undefined as number | undefined,
      card: null as string | null,
      cam: null as { at: [number, number, number]; look: [number, number, number] } | null,
      menu: false,
      capture: false,
      device: null as DeviceId | null,
      seat: false,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const shotRaw = params.get('shot');
  const deviceRaw = params.get('device');
  const device: DeviceId | null =
    deviceRaw === 'crt' || deviceRaw === 'nes' || deviceRaw === 'boombox' ? deviceRaw : null;
  return {
    tour: params.has('tour'),
    shot: shotRaw === null ? undefined : Number.parseInt(shotRaw, 10) || 0,
    card: params.get('card'),
    cam: parseCam(params.get('cam')),
    menu: params.has('menu'),
    capture: params.has('capture'),
    device,
    seat: params.get('seat') === 'gameboy',
  };
}

const DEMO_POSE: Record<string, { at: [number, number, number]; look: [number, number, number] }> = {
  vhs: { at: [LAYOUT.vhs_stack.x, 1.15, LAYOUT.vhs_stack.z + 0.9], look: [LAYOUT.vhs_stack.x, 0.2, LAYOUT.vhs_stack.z] },
  gameboy: { at: [LAYOUT.gameboy.x + 0.7, 1.2, LAYOUT.gameboy.z + 0.55], look: [LAYOUT.gameboy.x, 0.55, LAYOUT.gameboy.z] },
  cards: { at: [LAYOUT.cards.x + 0.15, 1.15, LAYOUT.cards.z + 0.85], look: [LAYOUT.cards.x, 0.08, LAYOUT.cards.z] },
  monopoly: { at: [LAYOUT.shelf.x + 0.9, 1.4, LAYOUT.shelf.z + 1.15], look: [LAYOUT.shelf.x, 1.15, LAYOUT.shelf.z] },
  toyshelf: { at: [LAYOUT.toyshelf.x - 1.45, 1.4, LAYOUT.toyshelf.z], look: [LAYOUT.toyshelf.x, 0.8, LAYOUT.toyshelf.z] },
  window: { at: [LAYOUT.window.x - 0.7, 1.5, LAYOUT.window.z + 1.4], look: [LAYOUT.window.x, 1.6, LAYOUT.window.z] },
  bed: { at: [LAYOUT.bed.x + 1.2, 1.35, LAYOUT.bed.z + 0.4], look: [LAYOUT.bed.x, 0.6, LAYOUT.bed.z] },
};

function DemoPose({ at, look }: { at: [number, number, number]; look: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(at[0], at[1], at[2]);
    camera.lookAt(look[0], look[1], look[2]);
  }, [camera, at, look]);
  return null;
}

interface WalkRoomProps {
  games: GameMetadata[];
  /** A game's own 2D board, shown over the room once its box is open on the table. */
  overlayGame: GameMetadata | null;
  onOpenBoard: (game: GameMetadata) => void;
  onOpenRulesForGame?: (game: GameMetadata) => void;
}

const ALL_SLOTS = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER, ...DESK_SLOTS];

/**
 * `?game=monopoly|connect4|battleship`, or `?play=<any game id>`, starts at
 * the table with the box unfolding, for capture scripts.
 */
function tableFromQuery(games: GameMetadata[]): GameMetadata | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const game = params.get('game');
  const id = params.get('play') ?? (game && TABLE_GAMES.has(game) ? game : null);
  if (!id) return null;
  return games.find(g => g.id === id) ?? null;
}

export function WalkRoom({
  games,
  overlayGame,
  onOpenBoard,
  onOpenRulesForGame,
}: WalkRoomProps) {
  const override = useMemo(readCameraOverride, []);
  const scripted =
    override.tour || override.shot !== undefined || Boolean(override.card) || override.capture || Boolean(override.cam);
  const [menuOpen, setMenuOpen] = useState(override.menu);
  const [mood, setMood] = useState<RoomMood>('warm-night');
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(() => sound.getMusicVolume());
  const [track, setTrack] = useState(() => sound.getTrack());
  const queryTable = useMemo(() => tableFromQuery(games), [games]);
  const [session, setSession] = useState<TableSession | null>(null);
  const sessionKey = useRef(0);
  const [crouched, setCrouched] = useState(false);
  const tableGame = session !== null;
  const [placed, setPlaced] = useState<LiveProp[]>([]);
  const [anchorId, setAnchorId] = useState(ANCHORS[0].id);
  const [placeHeight, setPlaceHeight] = useState(0.45);
  const [placeLift, setPlaceLift] = useState(0);
  const [placeShadow, setPlaceShadow] = useState(true);
  const [placeName, setPlaceName] = useState('');
  const placeBytes = useRef<ArrayBuffer | null>(null);
  const placeUrl = useRef<string | null>(null);
  const [engaged, setEngaged] = useState(
    () =>
      scripted ||
      Boolean(override.device) ||
      override.seat ||
      Boolean(queryTable) ||
      // Back after a reload: skip the title card and stand where you were.
      Boolean(resumedSession()?.engaged),
  );
  /** Bumped to rebuild the canvas after the browser drops its WebGL context. */
  const [glKey, setGlKey] = useState(0);
  const [glLost, setGlLost] = useState(false);
  const [tourLabel, setTourLabel] = useState<string | null>(null);
  const [aimed, setAimed] = useState<Aimed | null>(null);
  const [pulledGameId, setPulledGameId] = useState<GameId | null>(null);
  const [lampsWarm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** The card you opened stays up until you close it or walk away. */
  const [pinned, setPinned] = useState<Aimed | null>(null);
  const pinnedAt = useRef<{ x: number; z: number } | null>(null);
  const cardOpen = pinned !== null;
  const setCardOpen = useCallback((open: boolean) => {
    if (!open) setPinned(null);
  }, []);
  const [touch] = useState(isTouchDevice);
  const vp = useViewport();
  const walkLens = useWalkView();
  const fullscreen = useFullscreen();
  /** Immersive: hints and labels off, just the room (and the thumb stick). */
  const [immersiveOn, setImmersiveOn] = useState(false);
  const immersive = immersiveOn || fullscreen;
  const rig = useViewRig();
  const [padCrouch, setPadCrouch] = useState(false);
  const tvStatus = useTvStatus();
  const [device, setDevice] = useState<DeviceId | null>(override.device);
  const [seated, setSeated] = useState(override.seat);
  const [tamagotchi, setTamagotchi] = useState(false);
  const [rubik, setRubik] = useState(false);
  /** Something held up close (Tamagotchi, Rubik's Cube): the room waits behind it. */
  const holding = tamagotchi || rubik;
  const emulatorOn = (device === 'crt' || device === 'nes') && tvStatus.mode === 'emulator';
  const tvOn = (device === 'crt' || device === 'nes') && !scripted;
  const padUp = touch && (seated || emulatorOn);
  const viewKind = seated || padUp ? 'gameboy' : tvOn ? 'tv' : device === 'boombox' ? 'radio' : null;
  const big = rig.big && (tvOn || seated);
  const [flashPhase, setFlashPhase] = useState<'idle' | 'cover' | 'reveal'>('idle');
  const radioState = useRadio();
  const tapeOn = radioState.power;
  const radioError = radioState.error;
  const toastTimer = useRef<number | null>(null);
  const flashTimers = useRef<number[]>([]);
  const blockSelect = useRef(false);
  const heavyStep = useRef(false);
  const pullTimer = useRef<number | null>(null);

  const byId = useMemo(() => new Map(games.map(g => [g.id, g])), [games]);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (pullTimer.current) window.clearTimeout(pullTimer.current);
      flashTimers.current.forEach(id => window.clearTimeout(id));
    },
    [],
  );

  // The stereo and the room's background music never play over each other.
  useEffect(() => {
    if (radioState.power) sound.stopNostalgia();
    else if (musicOn && engaged && !device) sound.startNostalgia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioState.power]);

  blockSelect.current = flashPhase !== 'idle' || device !== null || seated || holding;

  useEffect(() => {
    let cancelled = false;
    loadPlacements()
      .then(rows => {
        if (!cancelled) setPlaced(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setMusic = useCallback((on: boolean) => {
    setMusicOn(on);
    if (on) sound.startNostalgia();
    else sound.stopNostalgia();
  }, []);

  const openMenu = useCallback(() => {
    document.exitPointerLock?.();
    setMenuOpen(true);
  }, []);

  const onUpload = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      flash('Upload a .glb — same type as the Drive meshes');
      return;
    }
    file.arrayBuffer().then(bytes => {
      if (placeUrl.current) URL.revokeObjectURL(placeUrl.current);
      placeBytes.current = bytes;
      placeUrl.current = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      setPlaceName(file.name.replace(/\.glb$/i, ''));
      setPlaceHeight(0.45);
      setPlaceLift(0);
      setAnchorId('floor-center');
      flash('Pick an anchor, set the size, then press Enter');
    });
  }, [flash]);

  const commitPlace = useCallback(() => {
    const bytes = placeBytes.current;
    const anchor = anchorById(anchorId);
    if (!bytes || !anchor || !placeName) return;
    const placement: SavedPlacement = {
      id: crypto.randomUUID(),
      name: placeName,
      position: anchor.position,
      rotY: anchor.rotY,
      height: placeHeight,
      lift: placeLift,
      shadow: placeShadow,
      anchorId: anchor.id,
    };
    const url = placeUrl.current ?? URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
    savePlacement(placement, bytes)
      .then(() => {
        setPlaced(prev => [...prev, { placement, url }]);
        placeBytes.current = null;
        placeUrl.current = null;
        setPlaceName('');
        flash(`${placement.name} stays in the room`);
      })
      .catch(() => flash('Could not save that mesh'));
  }, [anchorId, flash, placeHeight, placeLift, placeName, placeShadow]);

  useEffect(() => {
    if (!placeName) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitPlace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commitPlace, placeName]);

  const removePlaced = useCallback((id: string) => {
    deletePlacement(id).catch(() => {});
    setPlaced(prev => prev.filter(item => item.placement.id !== id));
  }, []);

  const ghost = useMemo(() => {
    const anchor = anchorById(anchorId);
    if (!placeName || !placeUrl.current || !anchor) return null;
    return {
      url: placeUrl.current,
      anchor,
      height: placeHeight,
      lift: placeLift,
      shadow: placeShadow,
    };
  }, [anchorId, placeHeight, placeLift, placeName, placeShadow]);

  const pinCard = useCallback((target: Aimed) => {
    pinnedAt.current = { x: walkRig.pos.x, z: walkRig.pos.z };
    setPinned(target);
    sound.playButtonClick();
  }, []);

  // Walking off closes the card; so does Escape.
  useEffect(() => {
    if (!pinned) return;
    const timer = window.setInterval(() => {
      const from = pinnedAt.current;
      if (from && Math.hypot(walkRig.pos.x - from.x, walkRig.pos.z - from.z) > 1.1) setPinned(null);
    }, 200);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  const onStep = useCallback(() => {
    heavyStep.current = !heavyStep.current;
    sound.playFootstep(heavyStep.current);
  }, []);

  /**
   * Every game starts the same way: the card table spawns on the rug, you are
   * set down crouched at its edge, and the box unfolds in front of you.
   */
  const startTable = useCallback((game: GameMetadata) => {
    document.exitPointerLock?.();
    setCardOpen(false);
    sessionKey.current += 1;
    walkRig.tableActive = true;
    walkRig.setCrouch(true);
    walkRig.teleport = { at: TABLE_SEAT.at, look: TABLE_SEAT.look };
    setSession({ game, phase: 'unfold', key: sessionKey.current });
  }, []);

  const playGame = useCallback(
    (game: GameMetadata) => {
      if (pulledGameId || session) return;
      setPulledGameId(game.id);
      setCardOpen(false);
      sound.playShelfSlide();
      flash(`Taking ${game.title} to the table`);
      pullTimer.current = window.setTimeout(() => {
        setPulledGameId(null);
        startTable(game);
      }, 620);
    },
    [flash, pulledGameId, session, startTable],
  );

  const onUnfolded = useCallback(() => {
    setSession(cur => (cur ? { ...cur, phase: 'play' } : cur));
    if (session && !TABLE_GAMES.has(session.game.id)) onOpenBoard(session.game);
  }, [onOpenBoard, session]);

  const packUp = useCallback(() => {
    setSession(cur => (cur && cur.phase !== 'pack' ? { ...cur, phase: 'pack' } : cur));
  }, []);

  const onPacked = useCallback(() => {
    setSession(null);
    walkRig.tableActive = false;
    walkRig.setCrouch(false);
  }, []);

  // Closing a 2D board packs its box back up on the table.
  const hadOverlay = useRef(false);
  useEffect(() => {
    if (overlayGame) hadOverlay.current = true;
    else if (hadOverlay.current) {
      hadOverlay.current = false;
      packUp();
    }
  }, [overlayGame, packUp]);

  useEffect(() => {
    const fn = (on: boolean) => setCrouched(on);
    walkRig.listeners.add(fn);
    return () => {
      walkRig.listeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (queryTable) startTable(queryTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!musicOn) return;
    sound.setMusicVolume(musicVolume);
    if (!sound.nostalgiaPlaying()) sound.startNostalgia();
  }, [musicOn, musicVolume]);

  const runFlash = useCallback((apply: () => void) => {
    flashTimers.current.forEach(id => window.clearTimeout(id));
    flashTimers.current = [];
    setFlashPhase('cover');
    flashTimers.current.push(
      window.setTimeout(() => {
        apply();
        setFlashPhase('reveal');
        flashTimers.current.push(window.setTimeout(() => setFlashPhase('idle'), 300));
      }, 150),
    );
  }, []);

  const enterDevice = useCallback(
    (id: DeviceId) => {
      document.exitPointerLock?.();
      setCardOpen(false);
      if (id === 'boombox') sound.stopNostalgia();
      sound.playButtonClick();
      runFlash(() => setDevice(id));
    },
    [runFlash],
  );

  const sitDown = useCallback(() => {
    document.exitPointerLock?.();
    setCardOpen(false);
    sound.stopNostalgia();
    sound.playButtonClick();
    runFlash(() => setSeated(true));
  }, [runFlash]);

  const standUp = useCallback(() => {
    runFlash(() => {
      setSeated(false);
      if (musicOn && !radio.state.power) sound.startNostalgia();
    });
  }, [musicOn, runFlash]);

  useEffect(() => {
    if (!seated) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      // Escape leaves big screen first, then stands you up.
      if (viewRig.big) setBig(false);
      else standUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seated, standUp]);

  const exitDevice = useCallback(() => {
    document.exitPointerLock?.();
    runFlash(() => {
      setDevice(null);
      if (musicOn && !radio.state.power) sound.startNostalgia();
    });
  }, [musicOn, runFlash]);


  useEffect(() => {
    if (!device) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (viewRig.big) setBig(false);
      else exitDevice();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [device, exitDevice]);

  // Frame the close-up around whatever the controls cover, for this
  // orientation; in big screen, lay the picture flat over the free area.
  useEffect(() => {
    if (!viewKind) return;
    const remoteFloats = viewKind === 'tv' && big;
    const insets = remoteFloats
      ? { top: 0, right: 0, bottom: 0, left: 0 }
      : insetsFor(viewKind, touch, vp, big);
    setInsets(insets);
    const glassId = seated ? 'gameboy' : 'tv';
    setGlassBig(
      glassId,
      big ? { x: insets.left, y: insets.top, w: vp.w - insets.left - insets.right, h: vp.h - insets.top - insets.bottom } : null,
    );
    return () => setGlassBig(glassId, null);
  }, [viewKind, touch, vp, big, seated]);

  // A walking zoom doesn't carry into close-ups.
  useEffect(() => {
    if (device || seated || holding) setWalkZoom(1);
  }, [device, seated, holding]);

  // Leaving the device always leaves big screen and real full screen.
  useEffect(() => {
    if (tvOn || seated) return;
    if (viewRig.big) setBig(false);
    resetView();
  }, [tvOn, seated]);

  const toggleBig = useCallback(
    (on: boolean) => {
      setBig(on);
      if (on) void enterFullscreen(touch);
      else void exitFullscreen();
    },
    [touch],
  );

  // F toggles big screen on a keyboard.
  useEffect(() => {
    if (!tvOn && !seated) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'KeyF' || event.repeat) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest('input, textarea, select')) return;
      toggleBig(!viewRig.big);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tvOn, seated, toggleBig]);

  const handleSelect = useCallback(
    (target: Aimed) => {
      if (blockSelect.current) return;
      if (target.kind === 'game' && target.gameId) {
        const game = byId.get(target.gameId as GameId);
        if (!game) return;
        // First press opens the box's card; pressing the same box again plays it.
        if (pinned?.id === target.id) playGame(game);
        else pinCard(target);
        return;
      }
      if (target.id === 'door') sound.playMoveClack();
      if (propCardFor(target.id)) pinCard(target);
    },
    [byId, pinCard, pinned, playGame],
  );

  const runCardAction = useCallback(
    (kind: CardAction) => {
      if (kind === 'tv') enterDevice('crt');
      else if (kind === 'nes') enterDevice('nes');
      else if (kind === 'radio') enterDevice('boombox');
      else if (kind === 'gameboy') sitDown();
      else if (kind === 'tamagotchi') {
        setPinned(null);
        sound.stopNostalgia();
        sound.playButtonClick();
        setTamagotchi(true);
      } else if (kind === 'rubik') {
        setPinned(null);
        sound.playButtonClick();
        setRubik(true);
      }
    },
    [enterDevice, sitDown],
  );
  // Capture scripts open things with window.__cardAction (dev server only).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __cardAction?: typeof runCardAction }).__cardAction = runCardAction;
  }, [runCardAction]);

  // An old commercial on a card pauses the room music; closing it brings the music back.
  const onCardVideo = useCallback(
    (playing: boolean) => {
      if (playing) sound.stopNostalgia();
      else if (musicOn && !radio.state.power) sound.startNostalgia();
    },
    [musicOn],
  );

  const aimedGame =
    pinned?.kind === 'game' && pinned.gameId ? byId.get(pinned.gameId as GameId) ?? null : null;
  const aimedProp = pinned && pinned.kind === 'prop' ? propCardFor(pinned.id) : null;
  const demoCardId = override.card;
  const demoPropId = demoCardId === 'vhs' ? 'vhs-stack' : demoCardId && propCardFor(demoCardId) ? demoCardId : null;
  const demoGame = demoCardId && !demoPropId ? byId.get(demoCardId as GameId) ?? null : null;
  const demoProp = demoPropId ? propCardFor(demoPropId) : null;
  const cardGame = demoGame ?? aimedGame;
  const cardProp = demoProp ?? aimedProp;
  const showCard = Boolean(demoGame || demoProp) || (engaged && cardOpen && (aimedGame || aimedProp));
  const walking = engaged && !device && !seated && !holding && !overlayGame && !pulledGameId && session?.phase !== 'unfold';


  return (
    <div data-room className="relative w-full h-[100dvh] overflow-hidden bg-[#140c14] select-none overscroll-none">
      <Canvas
        key={glKey}
        style={{ touchAction: 'none' }}
        // Nothing to draw while something is held up over the whole room.
        frameloop={override.capture ? 'demand' : holding ? 'never' : 'always'}
        dpr={override.capture ? 1 : [1, 1.5]}
        camera={{ fov: 72, near: 0.08, far: 40, position: [0.02, 1.58, 1.32] }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        onCreated={({ gl, scene }) => {
          // If the GPU drops this context (memory pressure, a driver reset),
          // rebuild the canvas instead of leaving a dead black screen. Room
          // state lives outside the canvas, so nothing else resets.
          const el = gl.domElement;
          let retry = 0;
          el.addEventListener('webglcontextlost', event => {
            event.preventDefault();
            setGlLost(true);
            retry = window.setTimeout(() => setGlKey(k => k + 1), 2500);
          });
          el.addEventListener('webglcontextrestored', () => {
            window.clearTimeout(retry);
            setGlKey(k => k + 1);
          });
          setGlLost(false);
          gl.setClearColor('#2a2030', 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
          scene.fog = new THREE.Fog('#2a2030', 10, 20);
        }}
      >
        <color attach="background" args={['#2a2030']} />
        <RealRoomScene
          games={games}
          hoveredId={aimed?.inReach ? aimed.id : null}
          pulledGameId={pulledGameId}
          tapeOn={tapeOn}
          lampsWarm={lampsWarm}
          mood={mood}
          placed={placed}
          showAnchors={menuOpen && Boolean(placeName)}
          ghost={ghost}
          onPickAnchor={(anchor: Anchor) => setAnchorId(anchor.id)}
          session={session}
          onUnfolded={onUnfolded}
          onPacked={onPacked}
          onLeaveTable={packUp}
          hideGameboy={seated}
        />
        <DeviceFocus device={scripted ? null : device} />
        {seated && <GameBoySeat />}
        <DeviceGestures active={Boolean(device || seated) && !big && !scripted} />
        {override.capture && <CaptureClock />}
        {override.cam ? (
          <DemoPose at={override.cam.at} look={override.cam.look} />
        ) : override.card && DEMO_POSE[override.card] ? (
          <DemoPose at={DEMO_POSE[override.card].at} look={DEMO_POSE[override.card].look} />
        ) : scripted ? (
          <TourCamera staticIndex={override.shot} onWaypoint={label => setTourLabel(label)} />
        ) : (
          <>
            <WalkController
              enabled={!pulledGameId && !device && !seated && !holding && session?.phase !== 'unfold' && !overlayGame}
              engaged={engaged}
              onStep={onStep}
            />
            <ReachRaycaster
              enabled={engaged && !pulledGameId && !device && !seated && !holding && !tableGame && !overlayGame}
              onAim={setAimed}
              onSelect={handleSelect}
              onTooFar={target => flash(`Walk closer to the ${target.label.toLowerCase()}`)}
            />
          </>
        )}
      </Canvas>
      {tamagotchi && (
        <TamagotchiPlay
          onClose={() => {
            setTamagotchi(false);
            if (musicOn && !radio.state.power) sound.startNostalgia();
          }}
        />
      )}
      {rubik && <RubikPlay onClose={() => setRubik(false)} />}
      {seated && <GameBoyGlass />}
      {seated && (
        <div data-ui="device" className="pointer-events-none absolute inset-0 z-40">
          <div className={`pointer-events-auto absolute flex gap-2 ${padUp && vp.landscape ? 'left-1/2 top-2 -translate-x-1/2' : 'right-4 top-4'}`}>
            <button
              type="button"
              onClick={() => toggleBig(!big)}
              className="rounded-xl border border-cyan-200/30 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100 hover:bg-black/80"
            >
              {big ? '⤡ Exit big screen' : '⤢ Big screen'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (big) toggleBig(false);
                standUp();
              }}
              className="rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
            >
              Stand up
            </button>
          </div>
          {!touch && !big && (
            <p className="absolute bottom-3 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
              Arrows · Z = A · X = B · Enter = Start · V = Select · scroll to zoom · F big screen · Esc stands up
            </p>
          )}
        </div>
      )}
      {padUp && <TouchGamepad tone={seated ? 'gb' : 'nes'} landscape={vp.landscape} />}
      {tvOn && (touch || big) && flashPhase !== 'cover' && (
        <TvRemote landscape={vp.landscape} big={big} onBig={toggleBig} padUp={padUp} />
      )}
      {(device === 'crt' || device === 'nes') && !scripted && <TvGlass initialMode={device === 'nes' ? 'gaming' : 'menu'} />}
      {session && session.phase === 'play' && TABLE_GAMES.has(session.game.id) && (
        <TableHudOverlay
          crouched={crouched}
          onStand={() => walkRig.setCrouch(false)}
          onCrouch={() => {
            walkRig.setCrouch(true);
            walkRig.teleport = { at: TABLE_SEAT.at, look: TABLE_SEAT.look };
          }}
        />
      )}
      {session?.phase === 'unfold' && (
        <p className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100">
          Opening {session.game.title}…
        </p>
      )}

      {scripted && tourLabel && (
        <div className="pointer-events-none absolute left-6 bottom-6 rounded-xl bg-black/60 border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-amber-200">
          {tourLabel}
        </div>
      )}

      {walking && !session && (
        <AimReticle aimed={showCard ? null : aimed} showDot touch={touch} />
      )}
      {touch && walking && !showCard && !menuOpen && (
        <TouchHud
          quiet={Boolean(session) || immersive}
          useLabel={!session && aimed?.inReach ? aimed.label : null}
          onUse={() => aimed?.inReach && handleSelect(aimed)}
          crouched={crouched || padCrouch}
          onCrouch={() => {
            if (walkRig.crouchLock) {
              walkRig.setCrouch(false);
              return;
            }
            pad.crouch = !pad.crouch;
            setPadCrouch(pad.crouch);
          }}
        />
      )}

      {/* Glass flash card — games + nostalgia props */}
      {!overlayGame && (engaged || scripted) && !device && !seated && !holding && (
      <button
        type="button"
        onClick={openMenu}
        className="absolute left-4 top-4 z-40 rounded-xl border border-white/20 bg-black/50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100 backdrop-blur-xl hover:bg-black/70"
      >
        Menu
      </button>
      )}
      <RoomStudio
        open={menuOpen}
        mood={mood}
        music={musicOn}
        musicVolume={musicVolume}
        track={track}
        fov={walkLens.fov}
        onFov={setWalkFov}
        onTrack={id => {
          setTrack(id);
          sound.setTrack(id);
        }}
        placing={Boolean(placeName)}
        placeName={placeName}
        anchorId={anchorId}
        height={placeHeight}
        lift={placeLift}
        shadow={placeShadow}
        saved={placed.map(item => ({ id: item.placement.id, name: item.placement.name }))}
        onClose={() => setMenuOpen(false)}
        onMood={setMood}
        onMusic={setMusic}
        onMusicVolume={value => {
          setMusicVolume(value);
          sound.setMusicVolume(value);
          if (musicOn && !sound.nostalgiaPlaying()) sound.startNostalgia();
        }}
        onFile={onUpload}
        onAnchor={setAnchorId}
        onHeight={setPlaceHeight}
        onLift={setPlaceLift}
        onShadow={setPlaceShadow}
        onCommit={commitPlace}
        onCancelPlace={() => {
          placeBytes.current = null;
          if (placeUrl.current) URL.revokeObjectURL(placeUrl.current);
          placeUrl.current = null;
          setPlaceName('');
        }}
        onDelete={removePlaced}
      />

      {showCard && !device && (
        <div className="absolute inset-x-2 bottom-2 z-40 flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-8 sm:top-1/2 sm:-translate-y-1/2">
          {cardGame ? (
            <MemoryFlashCard
              kind="game"
              game={cardGame}
              onPlay={() => playGame(cardGame)}
              onRules={() => {
                document.exitPointerLock?.();
                onOpenRulesForGame?.(cardGame);
              }}
              onClose={() => setCardOpen(false)}
            />
          ) : cardProp ? (
            <MemoryFlashCard
              kind="prop"
              prop={cardProp}
              onClose={() => setCardOpen(false)}
              onAction={cardProp.action ? () => runCardAction(cardProp.action!.kind) : undefined}
              onVideo={onCardVideo}
            />
          ) : null}
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute left-1/2 bottom-28 z-40 -translate-x-1/2 rounded-2xl bg-black/75 border border-white/15 px-4 py-2 text-sm text-white backdrop-blur sm:bottom-24">
          {toast}
        </div>
      )}

      {walking && !session && !menuOpen && (
        <ViewControls immersive={immersiveOn} onImmersive={setImmersiveOn} />
      )}

      {walking && !touch && !showCard && !immersive && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex w-[calc(100%-2rem)] flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-white/70">
          {[
            ['W A S D', 'walk'],
            ['Arrows · drag · 2-finger swipe', 'look'],
            ['Click', 'use things'],
            ['Pinch · + −', 'zoom'],
            ['C', 'duck'],
          ].map(([key, what]) => (
            <span key={key} className="rounded-lg bg-black/55 border border-white/10 px-2.5 py-1">
              <span className="text-amber-200">{key}</span> {what}
            </span>
          ))}
        </div>
      )}

      {device && flashPhase !== 'cover' && (
        <DeviceOverlay
          big={big}
          onBig={tvOn ? toggleBig : undefined}
          touch={touch}
          device={device}
          radioError={radioError}
          onBack={() => {
            if (big) toggleBig(false);
            exitDevice();
          }}
        />
      )}

      {flashPhase !== 'idle' && <div className={`device-flash ${flashPhase}`} />}
      {glLost && (
        <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-[#140c14]/80">
          <p className="rounded-full bg-black/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100">
            Graphics hiccup — putting the room back…
          </p>
        </div>
      )}

      {!engaged && !scripted && !menuOpen && !overlayGame && (
        <IntroCard
          wallTitles={neonGames(games).map(game => game.title)}
          onEnter={() => {
            setEngaged(true);
            saveEngaged();
            if (musicOn) sound.startNostalgia();
          }}
        />
      )}
    </div>
  );
}

export { ALL_SLOTS };
