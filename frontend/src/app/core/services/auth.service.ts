import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse, SessaoUsuario } from '../models/models';

const TOKEN_KEY = 'g7_token';
const USER_KEY = 'g7_user';

/**
 * Sessão do usuário: faz login, guarda o token na sessionStorage, verifica expiração e perfil e
 * encerra a sessão.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, senha }).pipe(
      tap(r => {
        sessionStorage.setItem(TOKEN_KEY, r.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify({ nome: r.nome, email: r.email, perfil: r.perfil }));
      }));
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  get token(): string | null { return sessionStorage.getItem(TOKEN_KEY); }

  get usuario(): SessaoUsuario | null {
    const u = sessionStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  }

  get autenticado(): boolean {
    const t = this.token;
    if (!t) return false;
    try {
      const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  }

  get admin(): boolean { return this.usuario?.perfil === 'ADMIN'; }
}
