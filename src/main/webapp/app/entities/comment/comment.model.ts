import dayjs from 'dayjs/esm';

import { ITask } from 'app/entities/task/task.model';
import { IUser } from 'app/entities/user/user.model';

export interface IComment {
  id: number;
  content?: string | null;
  createdAt?: dayjs.Dayjs | null;
  updatedAt?: dayjs.Dayjs | null;
  author?: Pick<IUser, 'id' | 'login'> | null;
  task?: Pick<ITask, 'id' | 'title'> | null;
}

export type NewComment = Omit<IComment, 'id'> & { id: null };
