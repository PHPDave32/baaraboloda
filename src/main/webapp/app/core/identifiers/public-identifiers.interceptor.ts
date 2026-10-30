import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { serverApiUrl } from 'app/config';
import { PublicIdentifiers, PublicEntity } from './public-identifiers.service';

export const publicIdentifiersInterceptor: HttpInterceptorFn = (request, next) => {
  const api = new URL(`${serverApiUrl}api/`, window.location.origin);
  const target = new URL(request.url, window.location.origin);
  if (target.origin !== api.origin || !target.pathname.startsWith(api.pathname)) return next(request);
  const identifiers = inject(PublicIdentifiers);
  const url = identifiers.apiUrl(request.url);
  return next(url === request.url ? request : request.clone({ url })).pipe(
    tap(event => {
      if (!(event instanceof HttpResponse)) return;
      const path = request.url.split('?')[0];
      let type: PublicEntity | undefined;
      if (/(?:^|\/)api\/tasks(?:\/|$)/.test(path)) type = 'task';
      else if (/(?:^|\/)api\/sprints(?:\/|$)/.test(path)) type = 'sprint';
      else if (/(?:^|\/)api\/projects(?:\/[^/]+(?:\/(?:close|reopen|members)(?:\/[^/]+)?)?)?$/.test(path)) type = 'project';
      identifiers.remember(type, event.body);
    }),
  );
};
