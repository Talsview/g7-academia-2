import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guards de rota: authGuard exige usuário logado; adminGuard exige também o perfil ADMIN.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado ? true : inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.autenticado) return inject(Router).createUrlTree(['/login']);
  return auth.admin ? true : inject(Router).createUrlTree(['/dashboard']);
};
