/**
 * Recorder for FlowPilot
 * Captures user interactions and converts them into workflow steps
 */

import { WorkflowStep, TargetDefinition, Selector, ElementFingerprint } from '../shared/types';
import { showRecordingBadge, hideOverlay } from './overlay';

const RECORDING_STORAGE_KEY = 'flowpilot_recording';
const INPUT_DEBOUNCE_MS = 500;

interface StoredRecording {
  active: boolean;
  steps: WorkflowStep[];
}

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

async function readStoredRecording(): Promise<StoredRecording | null> {
  if (!hasChromeStorage()) {
    return null;
  }
  const result = await chrome.storage.local.get(RECORDING_STORAGE_KEY);
  const value = result[RECORDING_STORAGE_KEY] as Partial<StoredRecording> | undefined;
  if (value?.active === true && Array.isArray(value.steps)) {
    return { active: true, steps: value.steps };
  }
  return null;
}

function writeStoredRecording(recording: StoredRecording): void {
  if (!hasChromeStorage()) {
    return;
  }
  void chrome.storage.local.set({ [RECORDING_STORAGE_KEY]: recording });
}

export class Recorder {
  private isRecording = false;
  private steps: WorkflowStep[] = [];
  private pendingInputs: Map<HTMLElement, { value: string; timer: number }> = new Map();

  /**
   * Restore an in-progress recording after the page was reloaded or navigated
   */
  async init(): Promise<void> {
    const stored = await readStoredRecording();
    if (!stored || !stored.active) {
      return;
    }
    this.isRecording = true;
    this.steps = stored.steps;
    showRecordingBadge(this.steps.length);
  }

  /**
   * Start recording user interactions
   */
  startRecording(): void {
    this.isRecording = true;
    this.steps = [];
    this.flushPendingInputs();
    writeStoredRecording({ active: true, steps: [] });
    showRecordingBadge(0);
  }

  /**
   * Stop recording and return the captured workflow
   * @returns The recorded workflow steps
   */
  async stopRecording(): Promise<WorkflowStep[]> {
    this.isRecording = false;
    this.flushPendingInputs();
    const steps = this.steps;
    this.steps = [];
    writeStoredRecording({ active: false, steps: [] });
    hideOverlay();
    return steps;
  }

  /**
   * Get the current recording state
   * @returns True if recording, false otherwise
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get the number of recorded steps
   * @returns Number of recorded steps
   */
  getStepCount(): number {
    return this.steps.length;
  }

  /**
   * Flush any debounced input steps (call before page unload)
   */
  flush(): void {
    this.flushPendingInputs();
  }

  /**
   * Record a click event
   * @param target - The element that was clicked
   */
  recordClick(target: HTMLElement): void {
    if (!this.isRecording) return;

    const step: WorkflowStep = {
      id: this.generateId(),
      type: 'click',
      enabled: true,
      target: this.generateTargetDefinition(target),
      timestamp: Date.now()
    };

    this.commitStep(step);
  }

  /**
   * Record an input event. Values are debounced per element so only the
   * final value is captured after the user stops typing.
   * @param target - The input element
   * @param value - The input value
   */
  recordInput(target: HTMLInputElement, value: string): void {
    if (!this.isRecording) return;

    const existing = this.pendingInputs.get(target);
    if (existing) {
      window.clearTimeout(existing.timer);
    }

    const timer = window.setTimeout(() => {
      this.pendingInputs.delete(target);
      this.commitInput(target, value);
    }, INPUT_DEBOUNCE_MS);

    this.pendingInputs.set(target, { value, timer });
  }

  /**
   * Record a select dropdown change. The step stores the visible label of the
   * chosen option (falling back to its value) for robust replay
   * @param target - The select element
   * @param label - Visible label of the selected option
   */
  recordSelect(target: HTMLSelectElement, label: string): void {
    if (!this.isRecording) return;

    const isSensitive = this.isSensitiveField(target);
    const step: WorkflowStep = {
      id: this.generateId(),
      type: 'select',
      enabled: true,
      target: this.generateTargetDefinition(target),
      input: {
        value: isSensitive ? '' : label,
        isSensitive,
        masked: isSensitive
      },
      timestamp: Date.now()
    };

    this.commitStep(step);
  }

  /**
   * Record a keydown event
   * @param event - The keydown event
   */
  recordKeyDown(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    // For now, we'll just record basic key events, but this could be expanded
    console.log('Recorded keydown:', event.key);
  }

  private commitInput(target: HTMLInputElement, value: string): void {
    // Focusing a field for typing also records a click; the two belong to one
    // interaction, so the redundant standalone click is dropped
    if (this.sameTarget(this.steps[this.steps.length - 1], target)) {
      this.steps.pop();
    }

    const isSensitive = this.isSensitiveField(target);
    const step: WorkflowStep = {
      id: this.generateId(),
      type: 'type',
      enabled: true,
      target: this.generateTargetDefinition(target),
      input: {
        // Sensitive values are never stored in plaintext
        value: isSensitive ? '' : value,
        isSensitive,
        masked: isSensitive
      },
      timestamp: Date.now()
    };

    this.commitStep(step);
  }

  /**
   * Whether the last recorded step is a click on the same element
   */
  private sameTarget(step: WorkflowStep | undefined, element: HTMLElement): boolean {
    if (!step || step.type !== 'click' || !step.target) {
      return false;
    }
    const fingerprint = step.target.fingerprint;
    return (
      fingerprint.tag === element.tagName.toLowerCase() &&
      fingerprint.id === element.id &&
      (fingerprint.name ?? '') === (element.getAttribute('name') ?? '') &&
      (fingerprint.ariaLabel ?? '') === (element.getAttribute('aria-label') ?? '')
    );
  }

  private commitStep(step: WorkflowStep): void {
    this.steps.push(step);
    writeStoredRecording({ active: true, steps: this.steps });
    showRecordingBadge(this.steps.length);
  }

  private flushPendingInputs(): void {
    for (const [element, pending] of this.pendingInputs) {
      window.clearTimeout(pending.timer);
      if (element instanceof HTMLInputElement) {
        this.commitInput(element, pending.value);
      }
    }
    this.pendingInputs.clear();
  }

  /**
   * Generate a target definition for a DOM element
   * @param element - The DOM element
   * @returns Target definition with selectors and fingerprint
   */
  private generateTargetDefinition(element: HTMLElement): TargetDefinition {
    const selectors: Selector[] = this.generateSelectors(element);
    const fingerprint: ElementFingerprint = this.generateFingerprint(element);

    return {
      selectors,
      fingerprint
    };
  }

  /**
   * Generate selectors for an element
   * @param element - The DOM element
   * @returns Array of selectors with confidence scores
   */
  private generateSelectors(element: HTMLElement): Selector[] {
    const selectors: Selector[] = [];

    // Generate selectors based on element properties
    if (element.id) {
      selectors.push({
        type: 'id',
        value: `#${CSS.escape(element.id)}`,
        confidence: 0.95
      });
    }

    if (element.getAttribute('data-testid')) {
      selectors.push({
        type: 'data-testid',
        value: `[data-testid="${element.getAttribute('data-testid')}"]`,
        confidence: 0.90
      });
    }

    // Tag-independent so aria hints survive tag changes (span -> button, etc.)
    if (element.getAttribute('aria-label')) {
      selectors.push({
        type: 'aria',
        value: `[aria-label="${element.getAttribute('aria-label')}"]`,
        confidence: 0.85
      });
    }

    // CSS selector
    selectors.push({
      type: 'css',
      value: this.generateCSSSelector(element),
      confidence: 0.70
    });

    // XPath
    selectors.push({
      type: 'xpath',
      value: this.generateXPath(element),
      confidence: 0.60
    });

    // Drop redundant duplicates (e.g. css selector identical to the id one)
    const seen = new Set<string>();
    return selectors.filter(selector => {
      const key = `${selector.type}:${selector.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate CSS selector for an element
   * @param element - The DOM element
   * @returns CSS selector string
   */
  private generateCSSSelector(element: HTMLElement): string {
    // Simple CSS selector generation
    let selector = element.tagName.toLowerCase();

    if (element.id) {
      selector += `#${element.id}`;
    } else if (element.className) {
      const classes = Array.from(element.classList).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }

    return selector;
  }

  /**
   * Generate XPath for an element
   * @param element - The DOM element
   * @returns XPath string
   */
  private generateXPath(element: HTMLElement): string {
    // Simple XPath generation
    let path = '';
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const nodeName = current.nodeName.toLowerCase();
      if (current.id) {
        path = `/${nodeName}[@id="${current.id}"]${path}`;
        break;
      } else {
        const siblings = Array.from(current.parentNode?.childNodes || []).filter(
          node => node.nodeType === Node.ELEMENT_NODE && node.nodeName === current.nodeName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path = `/${nodeName}[${index}]${path}`;
        } else {
          path = `/${nodeName}${path}`;
        }
      }
      current = current.parentNode as HTMLElement;
    }

    return path || '/';
  }

  /**
   * Generate element fingerprint
   * @param element - The DOM element
   * @returns Element fingerprint
   */
  private generateFingerprint(element: HTMLElement): ElementFingerprint {
    return {
      tag: element.tagName.toLowerCase(),
      text: element.textContent?.trim() || '',
      role: element.getAttribute('role') || '',
      ariaLabel: element.getAttribute('aria-label') || '',
      name: element.getAttribute('name') || null,
      id: element.id,
      classes: Array.from(element.classList),
      attributes: this.extractAttributes(element),
      relativePosition: this.calculateRelativePosition(element)
    };
  }

  /**
   * Extract element attributes
   * @param element - The DOM element
   * @returns Object with element attributes
   */
  private extractAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  /**
   * Calculate relative position
   * @param element - The DOM element
   * @returns Relative position coordinates
   */
  private calculateRelativePosition(element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return {
      x: rect.left / viewportWidth,
      y: rect.top / viewportHeight
    };
  }

  /**
   * Check if field is sensitive (password, etc.)
   * @param element - The DOM element
   * @returns True if sensitive field, false otherwise
   */
  private isSensitiveField(element: HTMLElement): boolean {
    const sensitiveNames = ['password', 'passwd', 'secret', 'token', 'api_key', 'apikey'];
    const elementName = element.getAttribute('name')?.toLowerCase() || '';
    const elementId = element.getAttribute('id')?.toLowerCase() || '';

    return sensitiveNames.some(name =>
      elementName.includes(name) || elementId.includes(name)
    );
  }

  /**
   * Generate unique ID
   * @returns Unique identifier string
   */
  private generateId(): string {
    return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}