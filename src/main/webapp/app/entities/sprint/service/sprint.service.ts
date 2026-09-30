import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT, serverApiUrl } from 'app/config';
import { createRequestOption } from 'app/core/request';
import { ISprint, NewSprint } from '../sprint.model';

export type PartialUpdateSprint = Partial<ISprint> & Pick<ISprint, 'id'>;

type RestOf<T extends ISprint | NewSprint> = Omit<T, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> & {
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RestSprint = RestOf<ISprint>;

export type NewRestSprint = RestOf<NewSprint>;

export type PartialUpdateRestSprint = RestOf<PartialUpdateSprint>;

@Service()
export class SprintsService {
  readonly sprintsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly sprintsResource = httpResource<RestSprint[]>(() => {
    const params = this.sprintsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of sprint that have been fetched. It is updated when the sprintsResource emits a new value.
   * In case of error while fetching the sprints, the signal is set to an empty array.
   */
  readonly sprints = computed(() =>
    (this.sprintsResource.hasValue() ? this.sprintsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly resourceUrl = `${serverApiUrl}api/sprints`;

  protected convertValueFromServer(restSprint: RestSprint): ISprint {
    return {
      ...restSprint,
      startDate: restSprint.startDate ? dayjs(restSprint.startDate) : undefined,
      endDate: restSprint.endDate ? dayjs(restSprint.endDate) : undefined,
      createdAt: restSprint.createdAt ? dayjs(restSprint.createdAt) : undefined,
      updatedAt: restSprint.updatedAt ? dayjs(restSprint.updatedAt) : undefined,
    };
  }
}

@Service()
export class SprintService extends SprintsService {
  protected readonly http = inject(HttpClient);

  create(sprint: NewSprint): Observable<ISprint> {
    const copy = this.convertValueFromClient(sprint);
    return this.http.post<RestSprint>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(sprint: ISprint): Observable<ISprint> {
    const copy = this.convertValueFromClient(sprint);
    return this.http
      .put<RestSprint>(`${this.resourceUrl}/${encodeURIComponent(this.getSprintIdentifier(sprint))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(sprint: PartialUpdateSprint): Observable<ISprint> {
    const copy = this.convertValueFromClient(sprint);
    return this.http
      .patch<RestSprint>(`${this.resourceUrl}/${encodeURIComponent(this.getSprintIdentifier(sprint))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: number): Observable<ISprint> {
    return this.http.get<RestSprint>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<ISprint[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestSprint[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getSprintIdentifier(sprint: Pick<ISprint, 'id'>): number {
    return sprint.id;
  }

  compareSprint(o1: Pick<ISprint, 'id'> | null, o2: Pick<ISprint, 'id'> | null): boolean {
    return o1 && o2 ? this.getSprintIdentifier(o1) === this.getSprintIdentifier(o2) : o1 === o2;
  }

  addSprintToCollectionIfMissing<Type extends Pick<ISprint, 'id'>>(
    sprintCollection: Type[],
    ...sprintsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const sprints: Type[] = sprintsToCheck.filter(sprintItem => sprintItem !== null && sprintItem !== undefined);
    if (sprints.length > 0) {
      const sprintCollectionIdentifiers = sprintCollection.map(sprintItem => this.getSprintIdentifier(sprintItem));
      const sprintsToAdd = sprints.filter(sprintItem => {
        const sprintIdentifier = this.getSprintIdentifier(sprintItem);
        if (sprintCollectionIdentifiers.includes(sprintIdentifier)) {
          return false;
        }
        sprintCollectionIdentifiers.push(sprintIdentifier);
        return true;
      });
      return [...sprintsToAdd, ...sprintCollection];
    }
    return sprintCollection;
  }

  protected convertValueFromClient<T extends ISprint | NewSprint | PartialUpdateSprint>(sprint: T): RestOf<T> {
    return {
      ...sprint,
      startDate: sprint.startDate?.format(DATE_FORMAT) ?? null,
      endDate: sprint.endDate?.format(DATE_FORMAT) ?? null,
      createdAt: sprint.createdAt?.toJSON() ?? null,
      updatedAt: sprint.updatedAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestSprint): ISprint {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestSprint[]): ISprint[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
