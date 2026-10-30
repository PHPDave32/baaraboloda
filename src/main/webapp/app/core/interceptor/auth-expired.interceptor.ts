import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { tap } from 'rxjs';

import { StateStorageService } from 'app/core/auth';
import { ToastService } from 'app/shared/toast/toast.service';
import { serverApiUrl } from 'app/config';
import { LoginService } from 'app/login/login.service';

export const authExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const loginService = inject(LoginService);
  const stateStorageService = inject(StateStorageService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    tap({
      error(err: HttpErrorResponse) {
        const token = stateStorageService.getAuthenticationToken();
        const isApi = req.url.startsWith(`${serverApiUrl}api/`);
        const isLogin = req.url.endsWith('api/authenticate') && req.method === 'POST';
        if (err.status === 401 && isApi && !isLogin && token && req.headers.get('Authorization') === `Bearer ${token}`) {
          loginService.logout();
          toast.info('Votre session a expiré. Veuillez vous reconnecter.');
          void router.navigate(['/login'], { replaceUrl: true });
        }
      },
    }),
  );
};
