/**
 * Recorder for FlowPilot
 * Captures user interactions and converts them into workflow steps
 */

import { WorkflowStep, StepType, TargetDefinition, Selector, ElementFingerprint } from '../shared/types';

export class Recorder {
  private isRecording: boolean = false;
  private steps: WorkflowStep[] = [];
  private lastTimestamp: number = 0;

  /**
   * Start recording user interactions
   */
  startRecording(): void {
    this.isRecording = true;
    this.steps = [];
    this.lastTimestamp = Date.now();
    console.log('Recorder started');
  }

  /**
   * Stop recording and return the captured workflow
   * @returns The recorded workflow steps
   */
  stopRecording(): WorkflowStep[] {
    this.isRecording = false;
    console.log('Recorder stopped. Recorded', this.steps.length, 'steps');
    return this.steps;
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

    this.steps.push(step);
    console.log('Recorded click step:', step.id);
  }

  /**
   * Record an input event
   * @param target - The input element
   * @param value - The input value
   */
  recordInput(target: HTMLInputElement, value: string): void {
    if (!this.isRecording) return;

    const step: WorkflowStep = {
      id: this.generateId(),
      type: 'type',
      enabled: true,
      target: this.generateTargetDefinition(target),
      input: {
        value,
        isSensitive: this.isSensitiveField(target),
        masked: this.isSensitiveField(target)
      },
      timestamp: Date.now()
    };

    this.steps.push(step);
    console.log('Recorded input step:', step.id);
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
        value: `#${element.id}`,
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

    if (element.getAttribute('aria-label')) {
      selectors.push({
        type: 'aria',
        value: `button[aria-label="${element.getAttribute('aria-label')}"]`,
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

    // Coordinates (fallback)
    selectors.push({
      type: 'coordinates',
      value: `${element.getBoundingClientRect().left},${element.getBoundingClientRect().top}`,
      confidence: 0.50
    });

    return selectors;
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
      let nodeName = current.nodeName.toLowerCase();
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