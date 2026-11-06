import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Plano } from '../../core/models/models';

/**
 * Listagem de planos; os botões de criar e editar só aparecem para o ADMIN.
 */
@Component({
  selector: 'app-planos-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="page-head"><h1>Planos</h1>
      @if (auth.admin) { <a class="btn" routerLink="/planos/novo">Novo plano</a> }</div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    <div class="card table-wrap" style="padding:0">
      <table>
        <thead><tr><th>Nome</th><th>Descrição</th><th class="num">Valor mensal</th><th class="num">Duração (meses)</th><th>Cadastro</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          @for (p of planos; track p.id) {
            <tr><td>{{ p.nome }}</td><td>{{ p.descricao }}</td>
              <td class="num">{{ p.valorMensal | currency:'BRL' }}</td><td class="num">{{ p.duracaoMeses }}</td>
              <td>{{ p.dataCadastro | date:'dd/MM/yyyy' }}</td>
              <td><span class="badge" [class]="p.ativo ? 'ATIVO' : 'INATIVO'">{{ p.ativo ? 'ATIVO' : 'INATIVO' }}</span></td>
              <td>@if (auth.admin) { <a class="btn secondary sm" [routerLink]="['/planos', p.id]">Editar</a> }</td></tr>
          } @empty { <tr><td colspan="7" class="empty">Nenhum plano cadastrado.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class PlanosListComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  planos: Plano[] = []; erro = '';
  ngOnInit() { this.api.planos().subscribe({ next: p => this.planos = p, error: e => this.erro = mensagemErro(e) }); }
}
