import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { Aluno, SituacaoFinanceira } from '../../core/models/models';

/**
 * Listagem de alunos com busca, filtro por situação, consulta financeira e ações de
 * desativar/reativar.
 */
@Component({
  selector: 'app-alunos-list',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe],
  template: `
    <div class="page-head"><h1>Alunos</h1><a class="btn" routerLink="/alunos/novo">Novo aluno</a></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    @if (info) { <div class="alert success">{{ info }}</div> }
    <div class="filters">
      <div><label for="busca">Nome ou CPF</label><input id="busca" [(ngModel)]="busca" (keyup.enter)="carregar()" /></div>
      <div><label for="st">Situação cadastral</label>
        <select id="st" [(ngModel)]="status" (change)="carregar()">
          <option value="">Todas</option><option>ATIVO</option><option>BLOQUEADO</option><option>INATIVO</option>
        </select></div>
      <button class="btn secondary" (click)="carregar()">Buscar</button>
    </div>
    <div class="card table-wrap" style="padding:0">
      <table>
        <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Cadastro</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          @for (a of alunos; track a.id) {
            <tr>
              <td>{{ a.nome }}</td><td>{{ a.cpf }}</td><td>{{ a.telefone }}</td>
              <td>{{ a.dataCadastro | date:'dd/MM/yyyy' }}</td>
              <td><span class="badge" [class]="a.status">{{ a.status }}</span></td>
              <td><div class="actions">
                <button class="btn secondary sm" (click)="verSituacao(a)">Financeiro</button>
                <a class="btn secondary sm" [routerLink]="['/alunos', a.id]">Editar</a>
                @if (a.status === 'INATIVO') { <button class="btn secondary sm" (click)="reativar(a)">Reativar</button> }
                @else { <button class="btn danger sm" (click)="desativar(a)">Desativar</button> }
              </div></td>
            </tr>
          } @empty { <tr><td colspan="6" class="empty">Nenhum aluno encontrado.</td></tr> }
        </tbody>
      </table>
    </div>
    @if (situacao) {
      <div class="card">
        <h2>Situação financeira — {{ situacao.nome }}</h2>
        <p>Cadastro: <span class="badge" [class]="situacao.situacaoCadastral">{{ situacao.situacaoCadastral }}</span>
           &nbsp; Pendentes: <strong>{{ situacao.qtdPendentes }}</strong>
           &nbsp; Atrasadas: <strong>{{ situacao.qtdAtrasadas }}</strong>
           &nbsp; Em aberto: <strong>{{ situacao.totalEmAberto | currency:'BRL' }}</strong>
           &nbsp; Inadimplente (&gt; 5 dias): <strong>{{ situacao.inadimplente ? 'Sim' : 'Não' }}</strong></p>
        <button class="btn secondary sm" (click)="situacao = undefined">Fechar</button>
      </div>
    }
  `,
})
export class AlunosListComponent implements OnInit {
  private api = inject(ApiService);
  alunos: Aluno[] = []; busca = ''; status = ''; erro = ''; info = ''; situacao?: SituacaoFinanceira;

  ngOnInit() { this.carregar(); }

  carregar() {
    this.api.alunos(this.busca, this.status).subscribe({ next: r => { this.alunos = r; this.erro = ''; }, error: e => this.erro = mensagemErro(e) });
  }

  verSituacao(a: Aluno) {
    this.api.situacao(a.id).subscribe({ next: s => this.situacao = s, error: e => this.erro = mensagemErro(e) });
  }

  desativar(a: Aluno) {
    if (!confirm(`Desativar o aluno ${a.nome}?`)) return;
    this.api.desativarAluno(a.id).subscribe({ next: () => { this.info = 'Aluno desativado.'; this.carregar(); }, error: e => this.erro = mensagemErro(e) });
  }

  reativar(a: Aluno) {
    this.api.reativarAluno(a.id).subscribe({
      next: r => { this.info = `Aluno reativado (situação atual: ${r.status}).`; this.carregar(); },
      error: e => this.erro = mensagemErro(e),
    });
  }
}
