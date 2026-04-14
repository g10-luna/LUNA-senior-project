import { RETURN_JOURNEY_STEPS } from '@/src/constants/returnJourney';
import type { BookReturnItem } from '@/src/services/bookReturns';
import type { DeliveryTaskItem } from '@/src/services/deliveryTasks';
import type { JourneyLine, JourneyLineState } from './returnJourneyTimeline';

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function mapToLines(states: JourneyLineState[], times: (string | null)[]): JourneyLine[] {
  return RETURN_JOURNEY_STEPS.map((s, i) => ({
    key: `j${i}`,
    title: s.title,
    subtitle: s.subtitle,
    timeLabel: times[i] ?? null,
    state: states[i] ?? 'upcoming',
  }));
}

function pickOutbound(tasks: DeliveryTaskItem[]) {
  return tasks.find((t) => t.return_pickup_leg === 'outbound');
}

function pickReturnLeg(tasks: DeliveryTaskItem[]) {
  return tasks.find((t) => t.return_pickup_leg === 'return');
}

/** Single-task / legacy returns (no return_pickup_leg metadata). */
function buildLegacyReturnJourneyLines(ret: BookReturnItem, task: DeliveryTaskItem | null): JourneyLine[] {
  if (ret.status === 'CANCELLED') {
    const lines = mapToLines(
      ['complete', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'],
      [formatWhen(ret.initiated_at), null, null, null, null, null],
    );
    lines.push({
      key: 'cancel',
      title: 'Cancelled',
      subtitle: 'This return is no longer active.',
      timeLabel: formatWhen(ret.completed_at),
      state: 'issue',
    });
    return lines;
  }

  if (ret.status === 'COMPLETED' && ret.student_confirmed_at && !ret.auto_closed_without_confirm_at) {
    const t1 = task ? formatWhen(task.created_at) : null;
    const tRun = task ? formatWhen(task.completed_at ?? task.started_at) : null;
    const tDone = formatWhen(ret.student_confirmed_at);
    return mapToLines(
      ['complete', 'complete', 'complete', 'complete', 'complete', 'complete'],
      [formatWhen(ret.initiated_at), t1, tRun, tDone, tRun, tDone],
    );
  }

  const states: JourneyLineState[] = ['complete', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
  const times: (string | null)[] = [formatWhen(ret.initiated_at), null, null, null, null, null];

  if (ret.status === 'PENDING') {
    states[1] = 'active';
    return mapToLines(states, times);
  }

  states[1] = 'complete';
  times[1] = task ? formatWhen(task.created_at) : null;

  if (!task) {
    states[2] = 'active';
    return mapToLines(states, times);
  }

  if (task.status === 'FAILED' || task.status === 'CANCELLED') {
    states[2] = 'issue';
    return mapToLines(states, times);
  }

  if (task.status === 'PENDING') {
    states[2] = 'active';
    return mapToLines(states, times);
  }

  if (task.status === 'QUEUED' || task.status === 'ASSIGNED') {
    states[2] = 'active';
    return mapToLines(states, times);
  }

  if (task.status === 'IN_PROGRESS') {
    states[2] = 'active';
    times[2] = formatWhen(task.started_at);
    return mapToLines(states, times);
  }

  if (task.status === 'COMPLETED') {
    states[2] = 'complete';
    times[2] = formatWhen(task.completed_at);
    states[4] = 'complete';
    times[4] = formatWhen(task.completed_at);

    if (ret.auto_closed_without_confirm_at) {
      states[3] = 'issue';
      times[3] = formatWhen(ret.auto_closed_without_confirm_at);
      return mapToLines(states, times);
    }

    if (ret.status === 'PICKED_UP' && !ret.student_confirmed_at) {
      states[3] = 'active';
      times[3] = formatWhen(task.completed_at);
      return mapToLines(states, times);
    }

    states[3] = 'complete';
    times[3] = formatWhen(ret.student_confirmed_at ?? ret.picked_up_at ?? task.completed_at);
    if (ret.status === 'COMPLETED') {
      states[5] = 'complete';
      times[5] = formatWhen(ret.student_confirmed_at ?? ret.completed_at);
    }
    return mapToLines(states, times);
  }

  return mapToLines(states, times);
}

/** Live timeline: two-leg return (outbound → student load → return leg → desk confirm). */
export function buildReturnJourneyLines(ret: BookReturnItem, tasks: DeliveryTaskItem[]): JourneyLine[] {
  const outbound = pickOutbound(tasks);
  const retLeg = pickReturnLeg(tasks);
  if (!outbound && !retLeg) {
    const primary = tasks.length ? tasks[tasks.length - 1] : null;
    return buildLegacyReturnJourneyLines(ret, primary);
  }

  if (ret.status === 'CANCELLED') {
    const lines = mapToLines(
      ['complete', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'],
      [formatWhen(ret.initiated_at), null, null, null, null, null],
    );
    lines.push({
      key: 'cancel',
      title: 'Cancelled',
      subtitle: 'This return is no longer active.',
      timeLabel: formatWhen(ret.completed_at),
      state: 'issue',
    });
    return lines;
  }

  if (ret.status === 'COMPLETED' && ret.admin_receipt_confirmed_at && !ret.auto_closed_without_confirm_at) {
    const tOut = outbound ? formatWhen(outbound.completed_at ?? outbound.started_at) : null;
    const tRet = retLeg ? formatWhen(retLeg.completed_at ?? retLeg.started_at) : null;
    const tDesk = formatWhen(ret.admin_receipt_confirmed_at);
    const tLoad = formatWhen(ret.student_book_loaded_at);
    return mapToLines(
      ['complete', 'complete', 'complete', 'complete', 'complete', 'complete'],
      [formatWhen(ret.initiated_at), formatWhen(outbound?.created_at), tOut, tLoad, tRet, tDesk],
    );
  }

  const states: JourneyLineState[] = ['complete', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
  const times: (string | null)[] = [formatWhen(ret.initiated_at), null, null, null, null, null];

  if (ret.status === 'PENDING') {
    states[1] = 'active';
    return mapToLines(states, times);
  }

  states[1] = 'complete';
  times[1] = outbound ? formatWhen(outbound.created_at) : null;

  if (!outbound) {
    states[2] = 'active';
    return mapToLines(states, times);
  }

  if (outbound.status === 'FAILED' || outbound.status === 'CANCELLED') {
    states[2] = 'issue';
    return mapToLines(states, times);
  }

  if (outbound.status === 'QUEUED' || outbound.status === 'ASSIGNED' || outbound.status === 'PENDING') {
    states[2] = 'active';
    return mapToLines(states, times);
  }

  if (outbound.status === 'IN_PROGRESS') {
    states[2] = 'active';
    times[2] = formatWhen(outbound.started_at);
    return mapToLines(states, times);
  }

  if (outbound.status === 'COMPLETED') {
    states[2] = 'complete';
    times[2] = formatWhen(outbound.completed_at);

    if (ret.status === 'AWAITING_STUDENT_LOAD') {
      states[3] = 'active';
      times[3] = formatWhen(outbound.completed_at);
      return mapToLines(states, times);
    }

    if (ret.auto_closed_without_confirm_at) {
      states[3] = 'issue';
      times[3] = formatWhen(ret.auto_closed_without_confirm_at);
      return mapToLines(states, times);
    }

    states[3] = 'complete';
    times[3] = formatWhen(ret.student_book_loaded_at);

    if (!retLeg) {
      states[4] = 'active';
      return mapToLines(states, times);
    }

    if (retLeg.status === 'QUEUED' || retLeg.status === 'PENDING' || retLeg.status === 'ASSIGNED') {
      states[4] = 'active';
      return mapToLines(states, times);
    }

    if (retLeg.status === 'IN_PROGRESS') {
      states[4] = 'active';
      times[4] = formatWhen(retLeg.started_at);
      return mapToLines(states, times);
    }

    if (retLeg.status === 'COMPLETED') {
      states[4] = 'complete';
      times[4] = formatWhen(retLeg.completed_at);

      if (ret.status === 'AWAITING_ADMIN_CONFIRM') {
        states[5] = 'active';
        return mapToLines(states, times);
      }

      if (ret.status === 'COMPLETED') {
        states[5] = 'complete';
        times[5] = formatWhen(ret.admin_receipt_confirmed_at ?? ret.completed_at);
      }
      return mapToLines(states, times);
    }
  }

  return mapToLines(states, times);
}
