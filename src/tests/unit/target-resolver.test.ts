// @vitest-environment jsdom
/**
 * Unit tests for the smart target resolver
 */

import { resolveTarget } from '../../content/target-resolver';
import { TargetDefinition } from '../../shared/types';

function makeTarget(partial: Partial<TargetDefinition>): TargetDefinition {
  return {
    selectors: [],
    fingerprint: {
      tag: 'button',
      text: '',
      role: '',
      ariaLabel: '',
      name: null,
      id: '',
      classes: [],
      attributes: {},
      relativePosition: { x: 0.5, y: 0.5 }
    },
    ...partial
  } as TargetDefinition;
}

describe('target resolver', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('resolves a plain css selector', async () => {
    const button = document.createElement('button');
    button.id = 'submit-order';
    document.body.appendChild(button);

    const target = makeTarget({
      selectors: [{ type: 'id', value: '#submit-order', confidence: 0.95 }]
    });

    expect(await resolveTarget(target, { timeoutMs: 50, pollIntervalMs: 5 })).toBe(button);
  });

  test('finds elements inside open shadow roots', async () => {
    const button = document.createElement('button');
    button.id = 'deep-submit';
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.appendChild(button);
    document.body.appendChild(host);

    const target = makeTarget({
      selectors: [{ type: 'id', value: '#deep-submit', confidence: 0.95 }]
    });

    expect(await resolveTarget(target, { timeoutMs: 50, pollIntervalMs: 5 })).toBe(button);
  });

  test('falls back to fingerprint matching when selectors no longer match', async () => {
    const button = document.createElement('button');
    button.textContent = 'Place order';
    document.body.appendChild(button);

    const target = makeTarget({
      selectors: [{ type: 'id', value: '#moved-long-ago', confidence: 0.95 }],
      fingerprint: {
        tag: 'button',
        text: 'Place order',
        role: '',
        ariaLabel: '',
        name: null,
        id: 'old-id',
        classes: [],
        attributes: {},
        relativePosition: { x: 0.5, y: 0.5 }
      }
    });

    expect(await resolveTarget(target, { timeoutMs: 50, pollIntervalMs: 5 })).toBe(button);
  });

  test('returns null for genuinely missing elements after the timeout', async () => {
    const target = makeTarget({
      selectors: [{ type: 'id', value: '#nowhere', confidence: 0.95 }]
    });

    expect(await resolveTarget(target, { timeoutMs: 20, pollIntervalMs: 5 })).toBeNull();
  });
});
