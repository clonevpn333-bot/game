// ============================================================================
//  Save / load to localStorage
// ============================================================================
const KEY = 'mc_clone_save_v1';

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }

export function saveGame(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
  catch (e) { console.warn('save failed', e); return false; }
}

export function loadGame() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
  catch (e) { return null; }
}
