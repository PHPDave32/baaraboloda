import dayjs from 'dayjs/esm';

import { IComment, NewComment } from './comment.model';

export const sampleWithRequiredData: IComment = {
  id: 20452,
  content: 'afin que amorphe',
};

export const sampleWithPartialData: IComment = {
  id: 19140,
  content: 'croâ',
  createdAt: dayjs('2026-09-21T00:42'),
  updatedAt: dayjs('2026-09-20T16:03'),
};

export const sampleWithFullData: IComment = {
  id: 28427,
  content: 'population du Québec oh',
  createdAt: dayjs('2026-09-21T05:18'),
  updatedAt: dayjs('2026-09-21T01:29'),
};

export const sampleWithNewData: NewComment = {
  content: 'isoler tic-tac infime',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
