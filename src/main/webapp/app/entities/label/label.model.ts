import { IProject } from 'app/entities/project/project.model';

export interface ILabel {
  id: number;
  name?: string | null;
  color?: string | null;
  project?: Pick<IProject, 'id' | 'name'> | null;
}

export type NewLabel = Omit<ILabel, 'id'> & { id: null };
