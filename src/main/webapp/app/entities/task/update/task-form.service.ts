import { Service } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config';
import { ITask, NewTask } from '../task.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ITask for edit and NewTaskFormGroupInput for create.
 */
type TaskFormGroupInput = ITask | PartialWithRequiredKeyOf<NewTask>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends ITask | NewTask> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TaskFormRawValue = FormValueOf<ITask>;

type NewTaskFormRawValue = FormValueOf<NewTask>;

type TaskFormDefaults = Pick<NewTask, 'id' | 'createdAt' | 'updatedAt'>;

type TaskFormGroupContent = {
  id: FormControl<TaskFormRawValue['id'] | NewTask['id']>;
  title: FormControl<TaskFormRawValue['title']>;
  description: FormControl<TaskFormRawValue['description']>;
  status: FormControl<TaskFormRawValue['status']>;
  priority: FormControl<TaskFormRawValue['priority']>;
  type: FormControl<TaskFormRawValue['type']>;
  storyPoints: FormControl<TaskFormRawValue['storyPoints']>;
  dueDate: FormControl<TaskFormRawValue['dueDate']>;
  position: FormControl<TaskFormRawValue['position']>;
  createdAt: FormControl<TaskFormRawValue['createdAt']>;
  updatedAt: FormControl<TaskFormRawValue['updatedAt']>;
  assignee: FormControl<TaskFormRawValue['assignee']>;
  reporter: FormControl<TaskFormRawValue['reporter']>;
  project: FormControl<TaskFormRawValue['project']>;
  sprint: FormControl<TaskFormRawValue['sprint']>;
};

export type TaskFormGroup = FormGroup<TaskFormGroupContent>;

@Service()
export class TaskFormService {
  createTaskFormGroup(task?: TaskFormGroupInput): TaskFormGroup {
    const taskRawValue = this.convertTaskToTaskRawValue({
      ...this.getFormDefaults(),
      ...(task ?? { id: null }),
    });

    return new FormGroup<TaskFormGroupContent>({
      id: new FormControl(
        { value: taskRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      title: new FormControl(taskRawValue.title, {
        validators: [Validators.required, Validators.maxLength(200)],
      }),
      description: new FormControl(taskRawValue.description, {
        validators: [Validators.maxLength(5000)],
      }),
      status: new FormControl(taskRawValue.status, {
        validators: [Validators.required],
      }),
      priority: new FormControl(taskRawValue.priority, {
        validators: [Validators.required],
      }),
      type: new FormControl(taskRawValue.type, {
        validators: [Validators.required],
      }),
      storyPoints: new FormControl(taskRawValue.storyPoints),
      dueDate: new FormControl(taskRawValue.dueDate),
      position: new FormControl(taskRawValue.position),
      createdAt: new FormControl(taskRawValue.createdAt),
      updatedAt: new FormControl(taskRawValue.updatedAt),
      assignee: new FormControl(taskRawValue.assignee),
      reporter: new FormControl(taskRawValue.reporter, {
        validators: [Validators.required],
      }),
      project: new FormControl(taskRawValue.project, {
        validators: [Validators.required],
      }),
      sprint: new FormControl(taskRawValue.sprint),
    });
  }

  getTask(form: TaskFormGroup): ITask | NewTask {
    return this.convertTaskRawValueToTask(form.getRawValue());
  }

  resetForm(form: TaskFormGroup, task: TaskFormGroupInput): void {
    const taskRawValue = this.convertTaskToTaskRawValue({ ...this.getFormDefaults(), ...task });
    form.reset({
      ...taskRawValue,
      id: { value: taskRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): TaskFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
  }

  private convertTaskRawValueToTask(rawTask: TaskFormRawValue | NewTaskFormRawValue): ITask | NewTask {
    return {
      ...rawTask,
      createdAt: dayjs(rawTask.createdAt, DATE_TIME_FORMAT),
      updatedAt: dayjs(rawTask.updatedAt, DATE_TIME_FORMAT),
    };
  }

  private convertTaskToTaskRawValue(
    task: ITask | (Partial<NewTask> & TaskFormDefaults),
  ): TaskFormRawValue | PartialWithRequiredKeyOf<NewTaskFormRawValue> {
    return {
      ...task,
      createdAt: task.createdAt ? task.createdAt.format(DATE_TIME_FORMAT) : undefined,
      updatedAt: task.updatedAt ? task.updatedAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
