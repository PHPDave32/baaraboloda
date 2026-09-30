import { Service } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config';
import { ISprint, NewSprint } from '../sprint.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ISprint for edit and NewSprintFormGroupInput for create.
 */
type SprintFormGroupInput = ISprint | PartialWithRequiredKeyOf<NewSprint>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends ISprint | NewSprint> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SprintFormRawValue = FormValueOf<ISprint>;

type NewSprintFormRawValue = FormValueOf<NewSprint>;

type SprintFormDefaults = Pick<NewSprint, 'id' | 'createdAt' | 'updatedAt'>;

type SprintFormGroupContent = {
  id: FormControl<SprintFormRawValue['id'] | NewSprint['id']>;
  name: FormControl<SprintFormRawValue['name']>;
  goal: FormControl<SprintFormRawValue['goal']>;
  status: FormControl<SprintFormRawValue['status']>;
  startDate: FormControl<SprintFormRawValue['startDate']>;
  endDate: FormControl<SprintFormRawValue['endDate']>;
  createdAt: FormControl<SprintFormRawValue['createdAt']>;
  updatedAt: FormControl<SprintFormRawValue['updatedAt']>;
  createdBy: FormControl<SprintFormRawValue['createdBy']>;
  project: FormControl<SprintFormRawValue['project']>;
};

export type SprintFormGroup = FormGroup<SprintFormGroupContent>;

@Service()
export class SprintFormService {
  createSprintFormGroup(sprint?: SprintFormGroupInput): SprintFormGroup {
    const sprintRawValue = this.convertSprintToSprintRawValue({
      ...this.getFormDefaults(),
      ...(sprint ?? { id: null }),
    });

    return new FormGroup<SprintFormGroupContent>({
      id: new FormControl(
        { value: sprintRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(sprintRawValue.name, {
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      goal: new FormControl(sprintRawValue.goal, {
        validators: [Validators.maxLength(2000)],
      }),
      status: new FormControl(sprintRawValue.status, {
        validators: [Validators.required],
      }),
      startDate: new FormControl(sprintRawValue.startDate),
      endDate: new FormControl(sprintRawValue.endDate),
      createdAt: new FormControl(sprintRawValue.createdAt),
      updatedAt: new FormControl(sprintRawValue.updatedAt),
      createdBy: new FormControl(sprintRawValue.createdBy),
      project: new FormControl(sprintRawValue.project, {
        validators: [Validators.required],
      }),
    });
  }

  getSprint(form: SprintFormGroup): ISprint | NewSprint {
    return this.convertSprintRawValueToSprint(form.getRawValue());
  }

  resetForm(form: SprintFormGroup, sprint: SprintFormGroupInput): void {
    const sprintRawValue = this.convertSprintToSprintRawValue({ ...this.getFormDefaults(), ...sprint });
    form.reset({
      ...sprintRawValue,
      id: { value: sprintRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): SprintFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
  }

  private convertSprintRawValueToSprint(rawSprint: SprintFormRawValue | NewSprintFormRawValue): ISprint | NewSprint {
    return {
      ...rawSprint,
      createdAt: dayjs(rawSprint.createdAt, DATE_TIME_FORMAT),
      updatedAt: dayjs(rawSprint.updatedAt, DATE_TIME_FORMAT),
    };
  }

  private convertSprintToSprintRawValue(
    sprint: ISprint | (Partial<NewSprint> & SprintFormDefaults),
  ): SprintFormRawValue | PartialWithRequiredKeyOf<NewSprintFormRawValue> {
    return {
      ...sprint,
      createdAt: sprint.createdAt ? sprint.createdAt.format(DATE_TIME_FORMAT) : undefined,
      updatedAt: sprint.updatedAt ? sprint.updatedAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
