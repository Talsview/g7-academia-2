import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { AuditoriaVencimento } from '../../core/models/models';

/**
 * Consulta da auditoria de vencimentos (somente ADMIN): valor anterior, novo, usuário, data e
 * justificativa.
 */
@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head"><h1>Auditoria de vencimentos</h1></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    <div class="filters">
      <div><label for="mid">ID da mensalidade</label><input id="mid" type="number" [(ngModel)]="mensalidadeId" (keyup.enter)="carregar()" /></div>
      <button class="btn secondary" (click)="carregar()">Filtrar</button>
    </div>
    <div class="card table-wrap" style="padding:0">
      <table>
        <thead><tr><th>Alterado em</th><th>Mensalidade</th><th>Vencimento anterior</th><th>Novo vencimento</th><th>Usuário</th><th>Justificativa</th></tr></thead>
        <tbody>
          @for (a of registros; track a.id) {
            <tr><td>{{ a.alteradoEm | date:'dd/MM/yyyy HH:mm:ss' }}</td><td>#{{ a.mensalidadeId }}</td>
              <td>{{ a.vencimentoAnterior | date:'dd/MM/yyyy' }}</td><td>{{ a.vencimentoNovo | date:'dd/MM/yyyy' }}</td>
              <td>{{ a.usuarioResponsavel }}</td><td>{{ a.justificativa || '—' }}</td></tr>
          } @empty { <tr><td colspan="6" class="empty">Nenhuma alteração de vencimento registrada.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class AuditoriaComponent implements OnInit {
  private api = inject(ApiService);
  registros: AuditoriaVencimento[] = []; mensalidadeId: number | null = null; erro = '';
  ngOnInit() { this.carregar(); }
  carregar() { this.api.auditoria(this.mensalidadeId).subscribe({ next: r => this.registros = r, error: e => this.erro = mensagemErro(e) }); }
}
