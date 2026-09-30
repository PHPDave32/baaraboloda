import dayjs from 'dayjs/esm';

import { IProject, NewProject } from './project.model';

export const sampleWithRequiredData: IProject = {
  id: 22823,
  name: 'comment',
  status: 'COMPLETED',
};

export const sampleWithPartialData: IProject = {
  id: 12852,
  name: 'bien que',
  projectKey: 'dès que',
  status: 'ACTIVE',
};

export const sampleWithFullData: IProject = {
  id: 1375,
  name: 'rectorat parer membre titulaire',
  description: 'de sorte que',
  projectKey: 'avex',
  iconColor: 'dorénavant de façon que',
  status: 'COMPLETED',
  createdAt: dayjs('2026-09-21T07:36'),
  updatedAt: dayjs('2026-09-21T02:04'),
};

export const sampleWithNewData: NewProject = {
  name: 'toc quant à',
  status: 'ARCHIVED',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
