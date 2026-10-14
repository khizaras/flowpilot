/**
 * On-page overlay used by the recorder and executor so the user can
 * always see what FlowPilot is doing on the current page
 */

const OVERLAY_ID = 'flowpilot-overlay';
const STYLE_ID = 'flowpilot-overlay-style';

function ensureBase(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      'position: fixed',
      'top: 12px',
      'left: 50%',
      'transform: translateX(-50%)',
      'z-index: 2147483647',
      'display: none',
      'align-items: center',
      'gap: 8px',
      'padding: 6px 12px',
      'border-radius: 999px',
      'background: rgba(17, 24, 39, 0.9)',
      'color: #ffffff',
      'font: 500 12px/1.2 system-ui, sans-serif',
      'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25)',
      'pointer-events: none'
    ].join(';');
    document.documentElement.appendChild(overlay);
  }
  return overlay;
}

// The pulse animation needs to live in a stylesheet because the badge
// content is re-created on every update
function ensureKeyframes(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '@keyframes flowpilot-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }';
  document.documentElement.appendChild(style);
}

function makeDot(color: string): HTMLElement {
  const dot = document.createElement('span');
  dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;';
  dot.style.backgroundColor = color;
  dot.style.animation = 'flowpilot-pulse 1s ease-in-out infinite';
  return dot;
}

function makeLabel(text: string): HTMLElement {
  const label = document.createElement('span');
  label.textContent = text;
  return label;
}

function setOverlay(build: (overlay: HTMLElement) => void): void {
  const overlay = ensureBase();
  if (!overlay) {
    return;
  }
  ensureKeyframes();
  overlay.textContent = '';
  build(overlay);
  overlay.style.display = 'flex';
}

export function showRecordingBadge(stepCount: number): void {
  setOverlay((overlay) => {
    overlay.append(
      makeDot('#EF4444'),
      makeLabel(`Recording · ${stepCount} step${stepCount === 1 ? '' : 's'}`)
    );
  });
}

export function showExecutionBadge(current: number, total: number): void {
  setOverlay((overlay) => {
    overlay.append(
      makeDot('#60A5FA'),
      makeLabel(`FlowPilot · running step ${current}/${total}`)
    );
  });
}

export function showExecutionResult(success: boolean, detail?: string): void {
  setOverlay((overlay) => {
    const label = success ? '✓ FlowPilot finished' : `✗ FlowPilot failed${detail ? `: ${detail}` : ''}`;
    overlay.append(makeDot(success ? '#10B981' : '#EF4444'), makeLabel(label));
  });
  // Results are transient; leave the page clean afterwards
  window.setTimeout(() => hideOverlay(), success ? 2500 : 4500);
}

export function hideOverlay(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.style.display = 'none';
    overlay.textContent = '';
  }
}

/**
 * Briefly outline an element so the user can follow which target is being acted on
 */
export function flashTarget(element: HTMLElement): void {
  const previousOutline = element.style.outline;
  const previousOffset = element.style.outlineOffset;
  element.style.outline = '2px solid #F59E0B';
  element.style.outlineOffset = '2px';
  window.setTimeout(() => {
    element.style.outline = previousOutline;
    element.style.outlineOffset = previousOffset;
  }, 450);
}
