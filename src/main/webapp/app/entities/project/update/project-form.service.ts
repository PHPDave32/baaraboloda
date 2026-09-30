import { Service } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config';
import { IProject, NewProject } from '../project.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IProject for edit and NewProjectFormGroupInput for create.
 */
type ProjectFormGroupInput = IProject | PartialWithRequiredKeyOf<NewProject>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IProject | NewProject> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ProjectFormRawValue = FormValueOf<IProject>;

type NewProjectFormRawValue = FormValueOf<NewProject>;

type ProjectFormDefaults = Pick<NewProject, 'id' | 'createdAt' | 'updatedAt' | 'memberses'>;

type ProjectFormGroupContent = {
  id: FormControl<ProjectFormRawValue['id'] | NewProject['id']>;
  name: FormControl<ProjectFormRawValue['name']>;
  description: FormControl<ProjectFormRawValue['description']>;
  projectKey: FormControl<ProjectFormRawValue['projectKey']>;
  iconColor: FormControl<ProjectFormRawValue['iconColor']>;
  status: FormControl<ProjectFormRawValue['status']>;
  createdAt: FormControl<ProjectFormRawValue['createdAt']>;
  updatedAt: FormControl<ProjectFormRawValue['updatedAt']>;
  owner: FormControl<ProjectFormRawValue['owner']>;
  memberses: FormControl<ProjectFormRawValue['memberses']>;
};

export type ProjectFormGroup = FormGroup<ProjectFormGroupContent>;

@Service()
export class ProjectFormService {
  createProjectFormGroup(project?: ProjectFormGroupInput): ProjectFormGroup {
    const projectRawValue = this.convertProjectToProjectRawValue({
      ...this.getFormDefaults(),
      ...(project ?? { id: null }),
    });

    return new FormGroup<ProjectFormGroupContent>({
      id: new FormControl(
        { value: projectRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(projectRawValue.name, {
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      description: new FormControl(projectRawValue.description, {
        validators: [Validators.maxLength(2000)],
      }),
      projectKey: new FormControl(projectRawValue.projectKey, {
        validators: [Validators.maxLength(20)],
      }),
      iconColor: new FormControl(projectRawValue.iconColor, {
        validators: [Validators.maxLength(30)],
      }),
      status: new FormControl(projectRawValue.status, {
        validators: [Validators.required],
      }),
      createdAt: new FormControl(projectRawValue.createdAt),
      updatedAt: new FormControl(projectRawValue.updatedAt),
      owner: new FormControl(projectRawValue.owner, {
        validators: [Validators.required],
      }),
      memberses: new FormControl(projectRawValue.memberses ?? []),
    });
  }

  getProject(form: ProjectFormGroup): IProject | NewProject {
    return this.convertProjectRawValueToProject(form.getRawValue());
  }

  resetForm(form: ProjectFormGroup, project: ProjectFormGroupInput): void {
    const projectRawValue = this.convertProjectToProjectRawValue({ ...this.getFormDefaults(), ...project });
    form.reset({
      ...projectRawValue,
      id: { value: projectRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ProjectFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdAt: currentTime,
      updatedAt: currentTime,
      memberses: [],
    };
  }

  private convertProjectRawValueToProject(rawProject: ProjectFormRawValue | NewProjectFormRawValue): IProject | NewProject {
    return {
      ...rawProject,
      createdAt: dayjs(rawProject.createdAt, DATE_TIME_FORMAT),
      updatedAt: dayjs(rawProject.updatedAt, DATE_TIME_FORMAT),
    };
  }

  private convertProjectToProjectRawValue(
    project: IProject | (Partial<NewProject> & ProjectFormDefaults),
  ): ProjectFormRawValue | PartialWithRequiredKeyOf<NewProjectFormRawValue> {
    return {
      ...project,
      createdAt: project.createdAt ? project.createdAt.format(DATE_TIME_FORMAT) : undefined,
      updatedAt: project.updatedAt ? project.updatedAt.format(DATE_TIME_FORMAT) : undefined,
      memberses: project.memberses ?? [],
    };
  }
}
