import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Anexa o token JWT às chamadas /api e encerra a sessão quando a API responde 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const autenticada = token && req.url.startsWith('/api') && !req.url.endsWith('/auth/login')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(autenticada).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
      return throwError(() => e);
    }));
};
