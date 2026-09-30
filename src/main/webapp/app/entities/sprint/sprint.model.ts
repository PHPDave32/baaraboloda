import dayjs from 'dayjs/esm';

import { SprintStatus } from 'app/entities/enumerations/sprint-status.model';
import { IProject } from 'app/entities/project/project.model';
import { IUser } from 'app/entities/user/user.model';

export interface ISprint {
  id: number;
  name?: string | null;
  goal?: string | null;
  status?: keyof typeof SprintStatus | null;
  startDate?: dayjs.Dayjs | null;
  endDate?: dayjs.Dayjs | null;
  createdAt?: dayjs.Dayjs | null;
  updatedAt?: dayjs.Dayjs | null;
  createdBy?: Pick<IUser, 'id' | 'login'> | null;
  project?: Pick<IProject, 'id' | 'name'> | null;
}

export type NewSprint = Omit<ISprint, 'id'> & { id: null };
