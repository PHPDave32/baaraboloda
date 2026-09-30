import dayjs from 'dayjs/esm';

import { ITask, NewTask } from './task.model';

export const sampleWithRequiredData: ITask = {
  id: 9181,
  title: 'pourvu que de peur que',
  status: 'IN_REVIEW',
  priority: 'CRITICAL',
  type: 'TASK',
};

export const sampleWithPartialData: ITask = {
  id: 25547,
  title: 'renvoyer',
  description: 'pourvu que',
  status: 'TODO',
  priority: 'LOW',
  type: 'EPIC',
  position: 5468,
  createdAt: dayjs('2026-09-20T19:37'),
  updatedAt: dayjs('2026-09-20T18:30'),
};

export const sampleWithFullData: ITask = {
  id: 13396,
  title: 'aussitôt que sitôt que',
  description: 'de manière à ce que au point que',
  status: 'DONE',
  priority: 'LOW',
  type: 'TASK',
  storyPoints: 9228,
  dueDate: dayjs('2026-09-21'),
  position: 21576,
  createdAt: dayjs('2026-09-21T10:14'),
  updatedAt: dayjs('2026-09-20T18:53'),
};

export const sampleWithNewData: NewTask = {
  title: 'dénoncer',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  type: 'EPIC',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
