/**
 * Local-calendar overdue / due-today helpers for staff tasks.
 * Run: node --test lib/task-due.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isDueOnLocalCalendarDay(isoDue, now = new Date()) {
  const due = new Date(isoDue);
  if (Number.isNaN(due.getTime())) return false;
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isTaskOverdue(task, now = new Date()) {
  if (task.status !== 'PENDING') return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfLocalDay(due).getTime() < startOfLocalDay(now).getTime();
}

describe('task-due local calendar', () => {
  const now = new Date(2026, 9, 16, 15, 30, 0); // 16 Oct 2026 local

  it('treats Jul/Aug due PENDING as overdue', () => {
    assert.equal(
      isTaskOverdue({ status: 'PENDING', dueDate: '2026-07-15T10:00:00.000Z' }, now),
      true
    );
    assert.equal(
      isTaskOverdue({ status: 'PENDING', dueDate: '2026-08-01T00:00:00.000Z' }, now),
      true
    );
  });

  it('does not mark COMPLETED as overdue even if due in the past', () => {
    assert.equal(
      isTaskOverdue({ status: 'COMPLETED', dueDate: '2026-07-15T10:00:00.000Z' }, now),
      false
    );
  });

  it('does not mark same local calendar day as overdue', () => {
    const todayLocal = new Date(2026, 9, 16, 8, 0, 0);
    assert.equal(
      isTaskOverdue({ status: 'PENDING', dueDate: todayLocal.toISOString() }, now),
      false
    );
    assert.equal(isDueOnLocalCalendarDay(todayLocal.toISOString(), now), true);
  });

  it('future due PENDING is not overdue', () => {
    assert.equal(
      isTaskOverdue({ status: 'PENDING', dueDate: '2026-11-01T12:00:00.000Z' }, now),
      false
    );
  });

  it('invalid due dates are not overdue / not due today', () => {
    assert.equal(isTaskOverdue({ status: 'PENDING', dueDate: 'not-a-date' }, now), false);
    assert.equal(isDueOnLocalCalendarDay('not-a-date', now), false);
  });
});

describe('task-due source + screen contracts', () => {
  it('exports helpers from lib/task-due.ts', () => {
    const src = readFileSync(join(root, 'lib/task-due.ts'), 'utf8');
    assert.match(src, /export function isTaskOverdue/);
    assert.match(src, /export function isDueOnLocalCalendarDay/);
    assert.match(src, /export function formatTaskDueDate/);
    assert.match(src, /status !== 'PENDING'/);
  });

  it('Home renames counters and shows overdue on pending tasks', () => {
    const src = readFileSync(join(root, 'app/(tabs)/index.tsx'), 'utf8');
    assert.match(src, /label="Due today"/);
    assert.match(src, /label="Completed \(due today\)"/);
    assert.doesNotMatch(src, /label="Task assigned"/);
    assert.match(src, /isTaskOverdue/);
    assert.match(src, /Overdue/);
    assert.match(src, /formatTaskDueDate/);
  });

  it('My Tasks shows accessible Overdue badge for overdue pending', () => {
    const src = readFileSync(join(root, 'app/(tabs)/my-tasks.tsx'), 'utf8');
    assert.match(src, /isTaskOverdue/);
    assert.match(src, /Overdue/);
    assert.match(src, /accessibilityLabel/);
    assert.match(src, /overdueBadge/);
  });
});
