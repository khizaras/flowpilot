/**
 * Unit tests for the Recorder component
 */

import { Recorder } from '../../content/recorder';

describe('Recorder', () => {
  test('should initialize correctly', () => {
    const recorder = new Recorder();
    expect(recorder).toBeDefined();
    expect(recorder.getIsRecording()).toBe(false);
  });

  test('should start and stop recording', () => {
    const recorder = new Recorder();

    recorder.startRecording();
    expect(recorder.getIsRecording()).toBe(true);

    recorder.stopRecording();
    expect(recorder.getIsRecording()).toBe(false);
  });

  test('should generate IDs', () => {
    const recorder = new Recorder();
    const id1 = recorder['generateId']();
    const id2 = recorder['generateId']();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});