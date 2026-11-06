import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/**
 * Moldura das telas internas: menu lateral (Auditoria só para ADMIN), usuário logado e botão Sair.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside>
        <div class="brand">G7 Academia</div>
        <nav>
          @for (i of itens; track i.rota) {
            <a [routerLink]="i.rota" routerLinkActive="ativo">{{ i.texto }}</a>
          }
          @if (auth.admin) { <a routerLink="/auditoria" routerLinkActive="ativo">Auditoria</a> }
        </nav>
        <div class="user">
          <strong>{{ auth.usuario?.nome }}</strong>
          <small>{{ auth.usuario?.perfil }}</small>
          <button class="btn secondary sm" (click)="auth.logout()">Sair</button>
        </div>
      </aside>
      <main><router-outlet /></main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    aside { width: 220px; background: var(--primary); color: #fff; display: flex; flex-direction: column; padding: 1rem 0; flex-shrink: 0; }
    .brand { font-weight: 700; font-size: 1.1rem; padding: 0 1.2rem 1rem; border-bottom: 1px solid rgba(255,255,255,.2); }
    nav { display: flex; flex-direction: column; padding: .75rem 0; flex: 1; }
    nav a { color: #dbe4ea; text-decoration: none; padding: .55rem 1.2rem; }
    nav a:hover { background: rgba(255,255,255,.08); }
    nav a.ativo { background: rgba(255,255,255,.16); color: #fff; font-weight: 600; }
    .user { padding: .75rem 1.2rem 0; border-top: 1px solid rgba(255,255,255,.2); display: flex; flex-direction: column; gap: .3rem; }
    .user small { color: #b8c7d1; }
    main { flex: 1; padding: 1.5rem; min-width: 0; }
    @media (max-width: 800px) {
      .layout { flex-direction: column; }
      aside { width: 100%; flex-direction: row; flex-wrap: wrap; align-items: center; padding: .5rem; }
      .brand { border: 0; padding: .3rem .6rem; }
      nav { flex-direction: row; flex-wrap: wrap; padding: 0; flex-basis: 100%; order: 3; }
      nav a { padding: .4rem .7rem; }
      .user { flex-direction: row; align-items: center; border: 0; padding: 0 .6rem; margin-left: auto; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  itens = [
    { rota: '/dashboard', texto: 'Dashboard' }, { rota: '/alunos', texto: 'Alunos' },
    { rota: '/planos', texto: 'Planos' }, { rota: '/matriculas', texto: 'Matrículas' },
    { rota: '/mensalidades', texto: 'Mensalidades' }, { rota: '/acesso', texto: 'Controle de acesso' },
    { rota: '/frequencia', texto: 'Frequência' },
  ];
}
