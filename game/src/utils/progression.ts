import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultProgress, PlayerProgress, isTankUpgradeLevels } from '../types/progress';
import { TANKS } from '../data/tanks';

function readLegacyProgress(): PlayerProgress {
  const progress = defaultProgress();
  try {
    const credits = Number(localStorage.getItem('ww2_tank_credits') ?? 500);
    if (Number.isSafeInteger(credits) && credits >= 0) progress.credits = credits;
    const unlocked = JSON.parse(localStorage.getItem('ww2_tank_unlocked') || 'null');
    if (Array.isArray(unlocked)) progress.unlockedTankIds = [...new Set([...progress.unlockedTankIds, ...unlocked.filter(id => typeof id === 'string' && Object.hasOwn(TANKS, id) && !TANKS[id].blueprintCost)])];
    const current = localStorage.getItem('ww2_tank_current');
    if (current && progress.unlockedTankIds.includes(current)) progress.currentTankId = current;
    const upgrades = JSON.parse(localStorage.getItem('ww2_tank_upgrades') || '{}');
    if (upgrades && typeof upgrades === 'object' && !Array.isArray(upgrades)) {
      for (const [tankId, levels] of Object.entries(upgrades)) {
        if (progress.unlockedTankIds.includes(tankId) && isTankUpgradeLevels(levels)) progress.upgrades[tankId] = levels;
      }
    }
  } catch {
    return progress;
  }
  return progress;
}

export function useProgression(progress: PlayerProgress, onLoad: (saved: PlayerProgress) => void) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading depot save…');
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(progress);
  const onLoadRef = useRef(onLoad);
  const savedSnapshot = useRef('');
  const revision = useRef(0);
  const inFlight = useRef(false);
  const loading = useRef(false);
  latest.current = progress;
  onLoadRef.current = onLoad;

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: readLegacyProgress() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load depot save.');
      const { revision: loadedRevision, ...saved } = result;
      revision.current = loadedRevision;
      savedSnapshot.current = JSON.stringify(saved);
      latest.current = saved;
      onLoadRef.current(saved);
      setReady(true);
      setStatus('Depot saved');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load depot save.');
    } finally {
      loading.current = false;
    }
  }, []);

  const save = useCallback(async () => {
    if (inFlight.current || !savedSnapshot.current) return;
    inFlight.current = true;
    setError(null);
    try {
      while (JSON.stringify(latest.current) !== savedSnapshot.current) {
        const snapshot = JSON.stringify(latest.current);
        setStatus('Saving depot…');
        const response = await fetch('/.netlify/functions/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: JSON.parse(snapshot), revision: revision.current }), keepalive: true });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to save progression.');
        revision.current = result.revision;
        savedSnapshot.current = snapshot;
      }
      setStatus('Depot saved');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save progression.');
      setStatus('Depot not saved');
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => { void save(); }, 350);
    return () => window.clearTimeout(timer);
  }, [ready, progress.credits, progress.currentTankId, progress.unlockedTankIds, progress.upgrades, progress.blueprintIds, save]);
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') void save(); };
    const warn = (event: BeforeUnloadEvent) => {
      if (ready && JSON.stringify(latest.current) !== savedSnapshot.current) {
        void save();
        event.preventDefault();
        event.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('beforeunload', warn);
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('beforeunload', warn); };
  }, [ready, save]);
  return { ready, status, error, retry: ready ? save : load };
}
