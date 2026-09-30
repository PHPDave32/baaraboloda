import dayjs from 'dayjs/esm';

import { ISprint, NewSprint } from './sprint.model';

export const sampleWithRequiredData: ISprint = {
  id: 4944,
  name: 'autant insipide',
  status: 'PLANNED',
};

export const sampleWithPartialData: ISprint = {
  id: 6507,
  name: 'plouf',
  status: 'PLANNED',
};

export const sampleWithFullData: ISprint = {
  id: 15912,
  name: 'sale à bas de envers',
  goal: 'sans doute pour que touriste',
  status: 'ACTIVE',
  startDate: dayjs('2026-09-20'),
  endDate: dayjs('2026-09-21'),
  createdAt: dayjs('2026-09-21T08:17'),
  updatedAt: dayjs('2026-09-20T20:05'),
};

export const sampleWithNewData: NewSprint = {
  name: 'dring',
  status: 'ACTIVE',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
