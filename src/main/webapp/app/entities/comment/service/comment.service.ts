import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { serverApiUrl } from 'app/config';
import { createRequestOption } from 'app/core/request';
import { IComment, NewComment } from '../comment.model';

export type PartialUpdateComment = Partial<IComment> & Pick<IComment, 'id'>;

type RestOf<T extends IComment | NewComment> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RestComment = RestOf<IComment>;

export type NewRestComment = RestOf<NewComment>;

export type PartialUpdateRestComment = RestOf<PartialUpdateComment>;

@Service()
export class CommentsService {
  readonly commentsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly commentsResource = httpResource<RestComment[]>(() => {
    const params = this.commentsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of comment that have been fetched. It is updated when the commentsResource emits a new value.
   * In case of error while fetching the comments, the signal is set to an empty array.
   */
  readonly comments = computed(() =>
    (this.commentsResource.hasValue() ? this.commentsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly resourceUrl = `${serverApiUrl}api/comments`;

  protected convertValueFromServer(restComment: RestComment): IComment {
    return {
      ...restComment,
      createdAt: restComment.createdAt ? dayjs(restComment.createdAt) : undefined,
      updatedAt: restComment.updatedAt ? dayjs(restComment.updatedAt) : undefined,
    };
  }
}

@Service()
export class CommentService extends CommentsService {
  protected readonly http = inject(HttpClient);

  create(comment: NewComment): Observable<IComment> {
    const copy = this.convertValueFromClient(comment);
    return this.http.post<RestComment>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(comment: IComment): Observable<IComment> {
    const copy = this.convertValueFromClient(comment);
    return this.http
      .put<RestComment>(`${this.resourceUrl}/${encodeURIComponent(this.getCommentIdentifier(comment))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(comment: PartialUpdateComment): Observable<IComment> {
    const copy = this.convertValueFromClient(comment);
    return this.http
      .patch<RestComment>(`${this.resourceUrl}/${encodeURIComponent(this.getCommentIdentifier(comment))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: number): Observable<IComment> {
    return this.http
      .get<RestComment>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IComment[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestComment[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getCommentIdentifier(comment: Pick<IComment, 'id'>): number {
    return comment.id;
  }

  compareComment(o1: Pick<IComment, 'id'> | null, o2: Pick<IComment, 'id'> | null): boolean {
    return o1 && o2 ? this.getCommentIdentifier(o1) === this.getCommentIdentifier(o2) : o1 === o2;
  }

  addCommentToCollectionIfMissing<Type extends Pick<IComment, 'id'>>(
    commentCollection: Type[],
    ...commentsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const comments: Type[] = commentsToCheck.filter(commentItem => commentItem !== null && commentItem !== undefined);
    if (comments.length > 0) {
      const commentCollectionIdentifiers = commentCollection.map(commentItem => this.getCommentIdentifier(commentItem));
      const commentsToAdd = comments.filter(commentItem => {
        const commentIdentifier = this.getCommentIdentifier(commentItem);
        if (commentCollectionIdentifiers.includes(commentIdentifier)) {
          return false;
        }
        commentCollectionIdentifiers.push(commentIdentifier);
        return true;
      });
      return [...commentsToAdd, ...commentCollection];
    }
    return commentCollection;
  }

  protected convertValueFromClient<T extends IComment | NewComment | PartialUpdateComment>(comment: T): RestOf<T> {
    return {
      ...comment,
      createdAt: comment.createdAt?.toJSON() ?? null,
      updatedAt: comment.updatedAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestComment): IComment {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestComment[]): IComment[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
