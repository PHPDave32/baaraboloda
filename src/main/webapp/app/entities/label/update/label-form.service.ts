import { Service } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { ILabel, NewLabel } from '../label.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ILabel for edit and NewLabelFormGroupInput for create.
 */
type LabelFormGroupInput = ILabel | PartialWithRequiredKeyOf<NewLabel>;

type LabelFormDefaults = Pick<NewLabel, 'id'>;

type LabelFormGroupContent = {
  id: FormControl<ILabel['id'] | NewLabel['id']>;
  name: FormControl<ILabel['name']>;
  color: FormControl<ILabel['color']>;
  project: FormControl<ILabel['project']>;
};

export type LabelFormGroup = FormGroup<LabelFormGroupContent>;

@Service()
export class LabelFormService {
  createLabelFormGroup(label?: LabelFormGroupInput): LabelFormGroup {
    const labelRawValue = {
      ...this.getFormDefaults(),
      ...(label ?? { id: null }),
    };

    return new FormGroup<LabelFormGroupContent>({
      id: new FormControl(
        { value: labelRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(labelRawValue.name, {
        validators: [Validators.required, Validators.maxLength(50)],
      }),
      color: new FormControl(labelRawValue.color, {
        validators: [Validators.maxLength(30)],
      }),
      project: new FormControl(labelRawValue.project, {
        validators: [Validators.required],
      }),
    });
  }

  getLabel(form: LabelFormGroup): ILabel | NewLabel {
    return form.getRawValue();
  }

  resetForm(form: LabelFormGroup, label: LabelFormGroupInput): void {
    const labelRawValue = { ...this.getFormDefaults(), ...label };
    form.reset({
      ...labelRawValue,
      id: { value: labelRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): LabelFormDefaults {
    return {
      id: null,
    };
  }
}
