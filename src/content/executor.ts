import { WorkflowStep } from '../shared/types';
import { flashTarget } from './overlay';
import { resolveTarget, ResolveOptions } from './target-resolver';

/**
 * Step Executor for FlowPilot
 * Executes a single recorded step in the frame it is loaded into. Cross-frame
 * orchestration (which frame holds the element) lives in the service worker
 */
export class Executor {
  /**
   * Execute one step in this frame
   * @param step - The step to execute
   * @param timeoutMs - Resolution window for finding the target element
   * @returns Promise resolving with whether the step acted on an element
   */
  async executeSingleStep(step: WorkflowStep, timeoutMs?: number): Promise<boolean> {
    const options: ResolveOptions = { timeoutMs: timeoutMs ?? 6000 };
    switch (step.type) {
      case 'click':
        return await this.executeClick(step, options);
      case 'type':
        return await this.executeType(step, options);
      case 'select':
        return await this.executeSelect(step, options);
      case 'scroll':
        // Scrolling is non-essential; cap the wait so runs stay snappy
        return await this.executeScroll(step, { timeoutMs: Math.min(options.timeoutMs ?? 6000, 1000) });
      default:
        // Wait and navigate steps are orchestrated in the service worker
        throw new Error('unsupported step type');
    }
  }

  /**
   * Execute a click step
   * @param step - The click step to execute
   * @param options - Target resolution options
   * @returns Promise that resolves with execution result
   */
  private async executeClick(step: WorkflowStep, options: ResolveOptions): Promise<boolean> {
    if (!step.target) return false;

    const element = await resolveTarget(step.target, options);
    if (!(element instanceof HTMLElement)) return false;

    flashTarget(element);
    element.scrollIntoView({ block: 'center' });
    element.click();
    return true;
  }

  /**
   * Execute a type step with per-character events so framework
   * listeners (React, Vue, ...) observe realistic typing
   * @param step - The type step to execute
   * @param options - Target resolution options
   * @returns Promise that resolves with execution result
   */
  private async executeType(step: WorkflowStep, options: ResolveOptions): Promise<boolean> {
    if (!step.target || !step.input) return false;

    const element = await resolveTarget(step.target, options);
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
      return false;
    }

    flashTarget(element);
    this.typeInto(element, step.input.value);
    return true;
  }

  private typeInto(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    element.focus();

    const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    const setValue = (next: string): void => {
      if (descriptor?.set) {
        descriptor.set.call(element, next);
      } else {
        element.value = next;
      }
    };

    // Replace whatever the field already contains
    setValue('');

    let current = '';
    for (const char of Array.from(value)) {
      current += char;
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      setValue(current);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Execute a select step, matching the recorded option by label, then value
   * @param step - The select step to execute
   * @param options - Target resolution options
   * @returns Promise that resolves with execution result
   */
  private async executeSelect(step: WorkflowStep, options: ResolveOptions): Promise<boolean> {
    if (!step.target || !step.input) return false;

    const element = await resolveTarget(step.target, options);
    if (!(element instanceof HTMLSelectElement)) {
      return false;
    }

    flashTarget(element);
    const wanted = step.input.value;
    const optionList = Array.from(element.options);
    let index = optionList.findIndex(option => (option.textContent ?? '').trim() === wanted);
    if (index < 0) {
      index = optionList.findIndex(option => option.value === wanted);
    }
    if (index < 0) {
      return false;
    }

    element.focus();
    element.selectedIndex = index;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /**
   * Execute a scroll step
   * @param step - The scroll step to execute
   * @param options - Target resolution options
   * @returns Promise that resolves with execution result
   */
  private async executeScroll(step: WorkflowStep, options: ResolveOptions): Promise<boolean> {
    if (step.target) {
      const element = await resolveTarget(step.target, options);
      if (!(element instanceof HTMLElement)) return false;
      element.scrollIntoView({ block: 'center' });
      return true;
    }
    window.scrollBy({ top: window.innerHeight / 2 });
    return true;
  }
}
