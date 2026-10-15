import { WorkflowRepository } from '../storage/workflow-repository';
import type { Workflow, WorkflowSchedule } from '../shared/types';

/**
 * Schedule engine for FlowPilot.
 *
 * The service worker opens a 1-minute "ticker" alarm; each tick evaluates
 * every enabled schedule and triggers the ones that are due. Metadata
 * (last fired minute, run counts) lives in local storage so it survives
 * service worker restarts.
 */

const SCHED_META_KEY = 'flowpilot_sched_meta';

interface ScheduleMeta {
  lastFiredKey?: string;
  lastFiredAt?: number;
  timesRun?: number;
}

type ScheduleMetaMap = Record<string, ScheduleMeta | undefined>;

type ScheduleTrigger = (workflow: Workflow) => Promise<void>;

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function minuteKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${hhmm(date)}`;
}

async function readMeta(): Promise<ScheduleMetaMap> {
  const result = await chrome.storage.local.get([SCHED_META_KEY]);
  return (result[SCHED_META_KEY] as ScheduleMetaMap | undefined) ?? {};
}

async function writeMeta(meta: ScheduleMetaMap): Promise<void> {
  await chrome.storage.local.set({ [SCHED_META_KEY]: meta });
}

export class Scheduler {
  constructor(
    private readonly workflows: WorkflowRepository,
    private readonly trigger: ScheduleTrigger
  ) {}

  async tick(): Promise<void> {
    const all = await this.workflows.getAllWorkflows();
    const scheduled = all.filter(workflow => workflow.schedule?.enabled === true);
    if (scheduled.length === 0) {
      return;
    }

    const meta = await readMeta();
    const now = new Date();
    let changed = false;

    for (const workflow of scheduled) {
      const schedule = workflow.schedule as WorkflowSchedule;
      const entry = meta[workflow.id] ?? {};

      if (!this.isDue(schedule, entry, now)) {
        continue;
      }

      meta[workflow.id] = {
        lastFiredKey: minuteKey(now),
        lastFiredAt: Date.now(),
        timesRun: (entry.timesRun ?? 0) + 1
      };
      changed = true;

      try {
        await this.trigger(workflow);
      } catch (error) {
        console.error('Scheduled run failed:', error);
      }

      // Auto-stop: 'once' schedules and count-limited schedules turn off
      const timesRun = meta[workflow.id]?.timesRun ?? 0;
      const occurrenceLimit =
        typeof schedule.occurrences === 'number' && schedule.occurrences > 0 ? schedule.occurrences : undefined;
      if (schedule.frequency === 'once' || (occurrenceLimit !== undefined && timesRun >= occurrenceLimit)) {
        workflow.schedule = { ...schedule, enabled: false };
        await this.workflows.saveWorkflow(workflow);
      }
    }

    if (changed) {
      await writeMeta(meta);
    }
  }

  /** Whether this schedule should fire on the given minute */
  private isDue(schedule: WorkflowSchedule, meta: ScheduleMeta | undefined, now: Date): boolean {
    if (meta?.lastFiredKey === minuteKey(now)) {
      return false; // already fired within this minute
    }

    switch (schedule.frequency) {
      case 'daily':
        return schedule.time === hhmm(now);
      case 'weekly':
        return (
          Array.isArray(schedule.weekdays) &&
          schedule.weekdays.includes(now.getDay()) &&
          schedule.time === hhmm(now)
        );
      case 'interval': {
        const interval =
          typeof schedule.intervalMinutes === 'number' && schedule.intervalMinutes >= 1
            ? schedule.intervalMinutes
            : 60;
        return Date.now() - (meta?.lastFiredAt ?? 0) >= interval * 60000;
      }
      case 'once': {
        const at = Date.parse(schedule.startAt ?? '');
        return Number.isFinite(at) && Date.now() >= at;
      }
      default:
        return false;
    }
  }
}
