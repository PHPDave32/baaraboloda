import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, catchError, of } from 'rxjs';

import { IComment } from '../comment.model';
import { CommentService } from '../service/comment.service';

const commentResolve = (route: ActivatedRouteSnapshot): Observable<null | IComment> => {
  const { id } = route.params;
  if (id) {
    const router = inject(Router);
    const service = inject(CommentService);
    return service.find(id).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          router.navigate(['404']);
        } else {
          router.navigate(['error']);
        }
        return EMPTY;
      }),
    );
  }

  return of(null);
};

export default commentResolve;
