/**
 * FlowPilot Recording Domain
 * Contains recording-related business logic
 */

import { WorkflowStep, StepType, TargetDefinition, Selector, ElementFingerprint } from '../../shared/types';

export class RecordingManager {
  // Generate a workflow step from a click event
  static generateClickStep(target: HTMLElement): WorkflowStep {
    return {
      id: this.generateId(),
      type: 'click',
      enabled: true,
      target: this.generateTargetDefinition(target),
      timestamp: Date.now()
    };
  }

  // Generate a workflow step from an input event
  static generateInputStep(target: HTMLInputElement, value: string): WorkflowStep {
    return {
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
  }

  // Generate target definition for a DOM element
  private static generateTargetDefinition(element: HTMLElement): TargetDefinition {
    const selectors: Selector[] = this.generateSelectors(element);
    const fingerprint: ElementFingerprint = this.generateFingerprint(element);

    return {
      selectors,
      fingerprint
    };
  }

  // Generate selectors for an element
  private static generateSelectors(element: HTMLElement): Selector[] {
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

  // Generate CSS selector for an element
  private static generateCSSSelector(element: HTMLElement): string {
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

  // Generate XPath for an element
  private static generateXPath(element: HTMLElement): string {
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

  // Generate element fingerprint
  private static generateFingerprint(element: HTMLElement): ElementFingerprint {
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

  // Extract element attributes
  private static extractAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  // Calculate relative position
  private static calculateRelativePosition(element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return {
      x: rect.left / viewportWidth,
      y: rect.top / viewportHeight
    };
  }

  // Check if field is sensitive
  private static isSensitiveField(element: HTMLElement): boolean {
    const sensitiveNames = ['password', 'passwd', 'secret', 'token', 'api_key', 'apikey'];
    const elementName = element.getAttribute('name')?.toLowerCase() || '';
    const elementId = element.getAttribute('id')?.toLowerCase() || '';

    return sensitiveNames.some(name =>
      elementName.includes(name) || elementId.includes(name)
    );
  }

  // Generate unique ID
  private static generateId(): string {
    return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate recording state
  static validateRecordingState(isRecording: boolean): boolean {
    // In a real implementation, this would check for valid recording conditions
    return true;
  }
}