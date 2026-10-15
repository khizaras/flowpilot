import { TargetDefinition, ElementFingerprint, Selector } from '../shared/types';

/**
 * Smart target resolution engine.
 *
 * Tries selectors in confidence order, falls through to a fingerprint-based
 * heuristic match when structure changed, searches inside shadow roots, and
 * keeps polling while the page renders late (SPAs, lazy content).
 */

export interface ResolveOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_POLL_MS = 250;
const FINGERPRINT_MIN_SCORE = 2.5;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function queryDeep(selector: string): Element[] {
  const matches: Element[] = [];
  const visit = (root: ParentNode): void => {
    let found: NodeListOf<Element> | undefined;
    try {
      found = root.querySelectorAll(selector);
    } catch {
      return; // invalid selector for this root
    }
    matches.push(...Array.from(found));

    let all: NodeListOf<Element>;
    try {
      all = root.querySelectorAll('*');
    } catch {
      return;
    }
    for (const element of all) {
      if (element.shadowRoot) {
        visit(element.shadowRoot);
      }
    }
  };
  visit(document);
  return matches;
}

function queryXPath(expression: string): Element | null {
  try {
    const node = document.evaluate(expression, document, null, 9, null).singleNodeValue;
    return node instanceof Element ? node : null;
  } catch {
    return null;
  }
}

/**
 * Old recordings stored aria selectors as `button[aria-label="x"]` even when
 * the element was not a button; normalize to a tag-independent match
 */
function normalizeAriaSelector(value: string): string | null {
  const match = value.match(/\[aria-label="([^"]*)"\]/);
  return match ? `[aria-label="${match[1]}"]` : null;
}

function resolveUsingSelector(selector: Selector): Element | null {
  try {
    switch (selector.type) {
      case 'id':
      case 'data-testid':
      case 'css': {
        const matches = queryDeep(selector.value);
        return matches[0] ?? null;
      }
      case 'aria': {
        const normalized = normalizeAriaSelector(selector.value);
        if (!normalized) break;
        const matches = queryDeep(normalized);
        return matches[0] ?? null;
      }
      case 'xpath': {
        const node = queryXPath(selector.value);
        return node ?? null;
      }
      default:
        break; // coordinates are recording-time only
    }
  } catch {
    // fall through to the next selector
  }
  return null;
}

function scoreAgainstFingerprint(candidate: Element, fingerprint: ElementFingerprint): number {
  let score = 0;

  if (candidate.tagName?.toLowerCase() === fingerprint.tag.toLowerCase()) {
    score += 1;
  }

  const text = (candidate.textContent ?? '').trim();
  if (fingerprint.text && text) {
    if (text === fingerprint.text) score += 3;
    else if (text.includes(fingerprint.text)) score += 2;
  }

  if (fingerprint.id && candidate.id === fingerprint.id) score += 3;

  if (fingerprint.name && candidate.getAttribute('name') === fingerprint.name) score += 2;
  if (fingerprint.ariaLabel && candidate.getAttribute('aria-label') === fingerprint.ariaLabel) score += 2;
  if (fingerprint.role && candidate.getAttribute('role') === fingerprint.role) score += 1;

  if (fingerprint.classes.length) {
    const classes = Array.from(candidate.classList ?? []);
    const overlap = fingerprint.classes.filter(c => classes.includes(c)).length;
    score += (overlap / fingerprint.classes.length) * 1.5;
  }

  if (fingerprint.text && 'value' in candidate && (candidate as HTMLInputElement).value === fingerprint.text) {
    score += 2;
  }

  // Stable structural attributes survive redesigns
  const recordedType = fingerprint.attributes?.type;
  if (recordedType && candidate.getAttribute('type') === recordedType) {
    score += 2;
  }

  // Recorded viewport position helps disambiguate identical twins
  const rect = (candidate as HTMLElement).getBoundingClientRect?.();
  if (fingerprint.relativePosition && rect && rect.width > 0 && rect.height > 0) {
    const dx = Math.abs(rect.left / window.innerWidth - fingerprint.relativePosition.x);
    const dy = Math.abs(rect.top / window.innerHeight - fingerprint.relativePosition.y);
    if (dx < 0.05 && dy < 0.08) {
      score += 1.5;
    }
  }

  return score;
}

/**
 * Last-resort match: find the element that most resembles the recorded
 * fingerprint. Survives structural rewrites, moving elements in the DOM,
 * dynamic class churn, and even tag changes (span -> button)
 */
function resolveByFingerprint(fingerprint: ElementFingerprint): Element | null {
  let best: Element | null = null;
  let bestScore = 0;

  for (const candidate of queryDeep(fingerprint.tag || '*')) {
    const score = scoreAgainstFingerprint(candidate, fingerprint);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  // Stage 2: the recorded tag itself may have changed after a redesign
  if (!(bestScore >= FINGERPRINT_MIN_SCORE && best)) {
    for (const candidate of queryDeep('*')) {
      const score = scoreAgainstFingerprint(candidate, fingerprint);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }

  return bestScore >= FINGERPRINT_MIN_SCORE && best ? best : null;
}

/**
 * Extract the recorded page coordinates of a step, used as the final
 * fallback when no selector and no fingerprint match anything
 */
export function resolveByCoordinates(target: TargetDefinition): { x: number; y: number } | null {
  const coordinate = (target.selectors ?? []).find(selector => selector.type === 'coordinates');
  if (!coordinate) {
    return null;
  }
  const [x, y] = coordinate.value.split(',').map(part => Number(part));
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

function resolveOnce(target: TargetDefinition): Element | null {
  for (const selector of target.selectors ?? []) {
    const element = resolveUsingSelector(selector);
    if (element) {
      return element;
    }
  }
  // Generous type guard: recordings and imports may carry a loosely typed target
  const fingerprint = (target as { fingerprint?: ElementFingerprint }).fingerprint;
  if (fingerprint) {
    return resolveByFingerprint(fingerprint);
  }
  return null;
}

/**
 * Resolve a recorded target to a live element, polling until the timeout
 * expires so late-rendered pages are handled gracefully
 */
export async function resolveTarget(target: TargetDefinition, options?: ResolveOptions): Promise<Element | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const element = resolveOnce(target);
    if (element) {
      return element;
    }
    if (Date.now() >= deadline) {
      return null;
    }
    await delay(pollMs);
  }
}
