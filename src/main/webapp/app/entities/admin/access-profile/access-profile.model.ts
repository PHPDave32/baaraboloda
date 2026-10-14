export interface IAccessProfile {
  id: number;
  name: string;
  description?: string | null;
  allProjects: boolean;
  permissions: string[];
}

export interface IPermissionItem {
  key: string;
  label: string;
  description: string;
}
