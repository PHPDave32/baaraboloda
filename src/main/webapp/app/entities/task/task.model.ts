import dayjs from 'dayjs/esm';

import { TaskPriority } from 'app/entities/enumerations/task-priority.model';
import { TaskStatus } from 'app/entities/enumerations/task-status.model';
import { TaskType } from 'app/entities/enumerations/task-type.model';
import { IProject } from 'app/entities/project/project.model';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { IUser } from 'app/entities/user/user.model';

export interface ITask {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: keyof typeof TaskStatus | null;
  priority?: keyof typeof TaskPriority | null;
  type?: keyof typeof TaskType | null;
  storyPoints?: number | null;
  dueDate?: dayjs.Dayjs | null;
  position?: number | null;
  createdAt?: dayjs.Dayjs | null;
  updatedAt?: dayjs.Dayjs | null;
  assignee?: Pick<IUser, 'id' | 'login'> | null;
  reporter?: Pick<IUser, 'id' | 'login'> | null;
  project?: Pick<IProject, 'id' | 'name'> | null;
  sprint?: Pick<ISprint, 'id' | 'name'> | null;
}

export type NewTask = Omit<ITask, 'id'> & { id: null };
