import dayjs from 'dayjs/esm';

import { ProjectStatus } from 'app/entities/enumerations/project-status.model';
import { IUser } from 'app/entities/user/user.model';

export interface IProject {
  id: number;
  name?: string | null;
  description?: string | null;
  projectKey?: string | null;
  iconColor?: string | null;
  status?: keyof typeof ProjectStatus | null;
  createdAt?: dayjs.Dayjs | null;
  updatedAt?: dayjs.Dayjs | null;
  owner?: Pick<IUser, 'id' | 'login'> | null;
  memberses?: Pick<IUser, 'id' | 'login'>[] | null;
}

export type NewProject = Omit<IProject, 'id'> & { id: null };
