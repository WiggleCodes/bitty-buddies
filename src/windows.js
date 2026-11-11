// Lets pets grab other app windows and tug them about (Windows only, Mischief mode).
// Uses koffi to call a few user32 functions. Everything here fails safe: if anything
// goes wrong we simply report "no window" and the pet does something else.
const { screen } = require('electron');

let api = null;
if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const RECT = koffi.struct('BB_RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
    api = {
      koffi,
      GetForegroundWindow: user32.func('void *GetForegroundWindow()'),
      GetWindowRect: user32.func('bool GetWindowRect(void *hWnd, _Out_ BB_RECT *rect)'),
      IsWindowVisible: user32.func('bool IsWindowVisible(void *hWnd)'),
      IsIconic: user32.func('bool IsIconic(void *hWnd)'),
      IsZoomed: user32.func('bool IsZoomed(void *hWnd)'),
      GetWindowThreadProcessId: user32.func('uint32 GetWindowThreadProcessId(void *hWnd, _Out_ uint32 *pid)'),
      SetWindowPos: user32.func('bool SetWindowPos(void *hWnd, void *after, int x, int y, int cx, int cy, uint32 flags)'),
      RECT
    };
  } catch { api = null; }
}

const SWP_NOSIZE = 0x1, SWP_NOZORDER = 0x4, SWP_NOACTIVATE = 0x10;
let held = null; // { hwnd, orig: physical rect, scale }

function rectOf(hwnd) {
  const r = {};
  if (!api.GetWindowRect(hwnd, r)) return null;
  return r;
}

// Finds the window the user is working in, if a pet could reasonably grab it.
// Returns its bounds in overlay (DIP) coordinates, or null.
function pickWindow(overlayBounds, ownPids) {
  if (!api) return null;
  try {
    const hwnd = api.GetForegroundWindow();
    if (!hwnd || !api.IsWindowVisible(hwnd) || api.IsIconic(hwnd) || api.IsZoomed(hwnd)) return null;
    const pid = [0];
    api.GetWindowThreadProcessId(hwnd, pid);
    if (ownPids.includes(pid[0])) return null;
    const r = rectOf(hwnd);
    if (!r) return null;
    const dip = screen.screenToDipRect(null, { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top });
    const wa = overlayBounds;
    // Skip the desktop, taskbar, full-screen apps and tiny popups.
    if (dip.width >= wa.width * 0.95 || dip.height >= wa.height * 0.95) return null;
    if (dip.width < 160 || dip.height < 100) return null;
    // Must be on this screen with its bottom edge visible above the taskbar.
    if (dip.x + dip.width < wa.x + 40 || dip.x > wa.x + wa.width - 40) return null;
    const bottom = dip.y + dip.height;
    if (bottom > wa.y + wa.height - 10 || bottom < wa.y + 60) return null;
    const scale = screen.getDisplayMatching(dip).scaleFactor || 1;
    held = { hwnd, orig: r, scale, last: r, offset: 0 };
    return { x: dip.x - wa.x, y: dip.y - wa.y, width: dip.width, height: dip.height };
  } catch { held = null; return null; }
}

// Moves the grabbed window `dx` DIPs from where it started. Returns false if the
// window has gone, or the user moved it themselves (then we let go).
function moveWindow(dx) {
  if (!api || !held) return false;
  try {
    const now = rectOf(held.hwnd);
    if (!now || now.left !== held.last.left || now.top !== held.last.top) { held = null; return false; }
    const x = held.orig.left + Math.round(dx * held.scale);
    api.SetWindowPos(held.hwnd, null, x, held.orig.top, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
    held.last = { ...held.last, left: x, top: held.orig.top };
    return true;
  } catch { held = null; return false; }
}

function release() { held = null; }

module.exports = { supported: () => !!api, pickWindow, moveWindow, release };
