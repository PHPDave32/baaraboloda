import { Service } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config';
import { IComment, NewComment } from '../comment.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IComment for edit and NewCommentFormGroupInput for create.
 */
type CommentFormGroupInput = IComment | PartialWithRequiredKeyOf<NewComment>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IComment | NewComment> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CommentFormRawValue = FormValueOf<IComment>;

type NewCommentFormRawValue = FormValueOf<NewComment>;

type CommentFormDefaults = Pick<NewComment, 'id' | 'createdAt' | 'updatedAt'>;

type CommentFormGroupContent = {
  id: FormControl<CommentFormRawValue['id'] | NewComment['id']>;
  content: FormControl<CommentFormRawValue['content']>;
  createdAt: FormControl<CommentFormRawValue['createdAt']>;
  updatedAt: FormControl<CommentFormRawValue['updatedAt']>;
  author: FormControl<CommentFormRawValue['author']>;
  task: FormControl<CommentFormRawValue['task']>;
};

export type CommentFormGroup = FormGroup<CommentFormGroupContent>;

@Service()
export class CommentFormService {
  createCommentFormGroup(comment?: CommentFormGroupInput): CommentFormGroup {
    const commentRawValue = this.convertCommentToCommentRawValue({
      ...this.getFormDefaults(),
      ...(comment ?? { id: null }),
    });

    return new FormGroup<CommentFormGroupContent>({
      id: new FormControl(
        { value: commentRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      content: new FormControl(commentRawValue.content, {
        validators: [Validators.required, Validators.maxLength(5000)],
      }),
      createdAt: new FormControl(commentRawValue.createdAt),
      updatedAt: new FormControl(commentRawValue.updatedAt),
      author: new FormControl(commentRawValue.author, {
        validators: [Validators.required],
      }),
      task: new FormControl(commentRawValue.task, {
        validators: [Validators.required],
      }),
    });
  }

  getComment(form: CommentFormGroup): IComment | NewComment {
    return this.convertCommentRawValueToComment(form.getRawValue());
  }

  resetForm(form: CommentFormGroup, comment: CommentFormGroupInput): void {
    const commentRawValue = this.convertCommentToCommentRawValue({ ...this.getFormDefaults(), ...comment });
    form.reset({
      ...commentRawValue,
      id: { value: commentRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): CommentFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
  }

  private convertCommentRawValueToComment(rawComment: CommentFormRawValue | NewCommentFormRawValue): IComment | NewComment {
    return {
      ...rawComment,
      createdAt: dayjs(rawComment.createdAt, DATE_TIME_FORMAT),
      updatedAt: dayjs(rawComment.updatedAt, DATE_TIME_FORMAT),
    };
  }

  private convertCommentToCommentRawValue(
    comment: IComment | (Partial<NewComment> & CommentFormDefaults),
  ): CommentFormRawValue | PartialWithRequiredKeyOf<NewCommentFormRawValue> {
    return {
      ...comment,
      createdAt: comment.createdAt ? comment.createdAt.format(DATE_TIME_FORMAT) : undefined,
      updatedAt: comment.updatedAt ? comment.updatedAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
