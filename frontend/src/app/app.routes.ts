import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';

/**
 * Mapa de rotas da SPA com carregamento sob demanda (lazy loading). Rotas protegidas por authGuard;
 * auditoria e edição de planos exigem ADMIN.
 */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'alunos', loadComponent: () => import('./features/alunos/alunos-list.component').then(m => m.AlunosListComponent) },
      { path: 'alunos/novo', loadComponent: () => import('./features/alunos/aluno-form.component').then(m => m.AlunoFormComponent) },
      { path: 'alunos/:id', loadComponent: () => import('./features/alunos/aluno-form.component').then(m => m.AlunoFormComponent) },
      { path: 'planos', loadComponent: () => import('./features/planos/planos-list.component').then(m => m.PlanosListComponent) },
      { path: 'planos/novo', canActivate: [adminGuard], loadComponent: () => import('./features/planos/plano-form.component').then(m => m.PlanoFormComponent) },
      { path: 'planos/:id', canActivate: [adminGuard], loadComponent: () => import('./features/planos/plano-form.component').then(m => m.PlanoFormComponent) },
      { path: 'matriculas', loadComponent: () => import('./features/matriculas/matriculas.component').then(m => m.MatriculasComponent) },
      { path: 'mensalidades', loadComponent: () => import('./features/mensalidades/mensalidades.component').then(m => m.MensalidadesComponent) },
      { path: 'acesso', loadComponent: () => import('./features/acesso/acesso.component').then(m => m.AcessoComponent) },
      { path: 'frequencia', loadComponent: () => import('./features/acesso/frequencia.component').then(m => m.FrequenciaComponent) },
      { path: 'auditoria', canActivate: [adminGuard], loadComponent: () => import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
