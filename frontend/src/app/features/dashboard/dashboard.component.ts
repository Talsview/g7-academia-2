import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Dashboard, Faturamento, MOTIVOS } from '../../core/models/models';

/**
 * Dashboard: indicadores, acessos recentes e faturamento mensal. O ADMIN pode executar as Procedures
 * manualmente.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="page-head">
      <h1>Dashboard</h1>
      @if (auth.admin) {
        <div class="actions">
          <button class="btn secondary" (click)="recalcular()">Recalcular inadimplência</button>
          <button class="btn secondary" (click)="atualizarFaturamento()">Atualizar faturamento</button>
        </div>
      }
    </div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    @if (info) { <div class="alert success">{{ info }}</div> }
    @if (d) {
      <div class="grid">
        <div class="kpi ok"><span>Alunos ativos</span><strong>{{ d.alunosAtivos }}</strong></div>
        <div class="kpi danger"><span>Alunos bloqueados</span><strong>{{ d.alunosBloqueados }}</strong></div>
        <div class="kpi warn"><span>Mensalidades pendentes</span><strong>{{ d.mensalidadesPendentes }}</strong></div>
        <div class="kpi danger"><span>Mensalidades atrasadas</span><strong>{{ d.mensalidadesAtrasadas }}</strong></div>
        <div class="kpi"><span>Recebimentos do mês</span><strong>{{ d.recebimentosMes | currency:'BRL' }}</strong></div>
      </div>
      <div class="card">
        <h2>Histórico recente de acessos</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Data/hora</th><th>Aluno</th><th>Resultado</th><th>Motivo</th></tr></thead>
          <tbody>
            @for (a of d.acessosRecentes; track a.id) {
              <tr><td>{{ a.dataHora | date:'dd/MM/yyyy HH:mm' }}</td><td>{{ a.aluno }}</td>
                  <td><span class="badge" [class]="a.resultado">{{ a.resultado }}</span></td>
                  <td>{{ motivo(a.motivoBloqueio) }}</td></tr>
            } @empty { <tr><td colspan="4" class="empty">Nenhum acesso registrado.</td></tr> }
          </tbody>
        </table></div>
      </div>
      <div class="card">
        <h2>Faturamento mensal (view materializada)</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Mês</th><th class="num">Pagamentos</th><th class="num">Total recebido</th><th class="num">Total arrecadado (acumulado)</th></tr></thead>
          <tbody>
            @for (f of faturamento; track f.mesReferencia) {
              <tr><td>{{ f.mesReferencia | date:'MM/yyyy' }}</td><td class="num">{{ f.quantidadePagamentos }}</td>
                  <td class="num">{{ f.totalRecebido | currency:'BRL' }}</td>
                  <td class="num">{{ f.valorTotalArrecadado | currency:'BRL' }}</td></tr>
            } @empty { <tr><td colspan="4" class="empty">Sem pagamentos registrados.</td></tr> }
          </tbody>
        </table></div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  d?: Dashboard; faturamento: Faturamento[] = []; erro = ''; info = '';

  ngOnInit() { this.carregar(); }

  motivo(m: string | null) { return m ? (MOTIVOS[m] ?? m) : '—'; }

  carregar() {
    this.api.dashboard().subscribe({ next: d => this.d = d, error: e => this.erro = mensagemErro(e) });
    this.api.faturamento().subscribe({ next: f => this.faturamento = f, error: e => this.erro = mensagemErro(e) });
  }

  recalcular() {
    this.erro = ''; this.info = '';
    this.api.recalcularInadimplencia().subscribe({
      next: r => { this.info = `Procedure executada: ${r.bloqueados} aluno(s) bloqueado(s), ${r.desbloqueados} desbloqueado(s).`; this.carregar(); },
      error: e => this.erro = mensagemErro(e),
    });
  }

  atualizarFaturamento() {
    this.erro = ''; this.info = '';
    this.api.atualizarFaturamento().subscribe({
      next: f => { this.faturamento = f; this.info = 'View materializada de faturamento atualizada.'; this.carregar(); },
      error: e => this.erro = mensagemErro(e),
    });
  }
}
