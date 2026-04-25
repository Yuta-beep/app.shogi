import type { HomeSnapshot } from '@/domain/models/home';
import { createLoadHomeSnapshotUseCase } from '@/usecases/home/create-home-usecases';

const emptySnapshot: HomeSnapshot = {
  playerName: '',
  rating: 0,
  pawnCurrency: 0,
  goldCurrency: 0,
  playerRank: 1,
  playerExp: 0,
  stamina: 50,
  maxStamina: 50,
  nextRecoveryAt: null,
};

type Listener = () => void;
type HomeSnapshotStoreState = {
  snapshot: HomeSnapshot;
  isLoading: boolean;
  error: Error | null;
};

const FRESH_MS = 5_000;
const listeners = new Set<Listener>();
const loadUseCase = createLoadHomeSnapshotUseCase();

let snapshot: HomeSnapshot = emptySnapshot;
let lastLoadedAt = 0;
let inFlight: Promise<HomeSnapshot> | null = null;
let error: Error | null = null;
let state: HomeSnapshotStoreState = {
  snapshot,
  isLoading: false,
  error,
};

function syncState() {
  state = {
    snapshot,
    isLoading: inFlight !== null,
    error,
  };
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeHomeSnapshot(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHomeSnapshotState() {
  return state;
}

export function loadHomeSnapshot(force = false): Promise<HomeSnapshot> {
  const now = Date.now();
  if (!force && now - lastLoadedAt < FRESH_MS) {
    return Promise.resolve(snapshot);
  }
  if (inFlight) return inFlight;

  inFlight = loadUseCase
    .execute()
    .then((next) => {
      snapshot = next;
      lastLoadedAt = Date.now();
      error = null;
      return next;
    })
    .catch((caught: unknown) => {
      error = caught instanceof Error ? caught : new Error(String(caught));
      throw error;
    })
    .finally(() => {
      inFlight = null;
      syncState();
      notify();
    });

  syncState();
  notify();
  return inFlight;
}
