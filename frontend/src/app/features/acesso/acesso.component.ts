import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { Acesso, Aluno, MOTIVOS } from '../../core/models/models';

/**
 * Tela da recepção: registra o acesso do aluno e mostra, em destaque, se foi liberado ou bloqueado e
 * por quê.
 */
@Component({
  selector: 'app-acesso',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head"><h1>Controle de acesso</h1></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    <div class="card">
      <div class="filters" style="margin:0">
        <div style="max-width:380px;flex:2 1 260px"><label for="al">Aluno</label>
          <select id="al" [(ngModel)]="alunoId"><option [ngValue]="null">Selecione o aluno</option>
            @for (a of alunos; track a.id) { <option [ngValue]="a.id">{{ a.nome }} ({{ a.status }})</option> }</select></div>
        <button class="btn" [disabled]="!alunoId || enviando" (click)="registrar()">Registrar acesso</button>
      </div>
    </div>
    @if (resultado) {
      <div class="resultado" [class.ok]="resultado.resultado === 'LIBERADO'" [class.bloq]="resultado.resultado === 'BLOQUEADO'">
        <strong>{{ resultado.resultado === 'LIBERADO' ? 'ACESSO LIBERADO' : 'ACESSO BLOQUEADO' }}</strong>
        <span>{{ resultado.aluno }}</span>
        @if (resultado.motivoBloqueio) { <span>Motivo: {{ motivo(resultado.motivoBloqueio) }}</span> }
      </div>
    }
    <div class="card">
      <h2>Últimas tentativas</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Data/hora</th><th>Aluno</th><th>Resultado</th><th>Motivo</th></tr></thead>
        <tbody>
          @for (a of recentes; track a.id) {
            <tr><td>{{ a.dataHora | date:'dd/MM/yyyy HH:mm:ss' }}</td><td>{{ a.aluno }}</td>
              <td><span class="badge" [class]="a.resultado">{{ a.resultado }}</span></td><td>{{ motivo(a.motivoBloqueio) }}</td></tr>
          } @empty { <tr><td colspan="4" class="empty">Nenhum acesso registrado.</td></tr> }
        </tbody>
      </table></div>
    </div>
  `,
  styles: [`
    .resultado { display: flex; flex-direction: column; gap: .2rem; padding: 1.1rem 1.3rem; border-radius: 6px; margin-bottom: 1rem; }
    .resultado strong { font-size: 1.3rem; }
    .resultado.ok { background: var(--ok-bg); color: var(--ok); border: 1px solid var(--ok); }
    .resultado.bloq { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger); }
  `],
})
export class AcessoComponent implements OnInit {
  private api = inject(ApiService);
  alunos: Aluno[] = []; recentes: Acesso[] = []; alunoId: number | null = null;
  resultado?: Acesso; erro = ''; enviando = false;

  ngOnInit() {
    this.api.alunos().subscribe({ next: a => this.alunos = a, error: e => this.erro = mensagemErro(e) });
    this.recarregar();
  }

  motivo(m: string | null) { return m ? (MOTIVOS[m] ?? m) : '—'; }
  recarregar() { this.api.acessos(null, '', 10).subscribe({ next: r => this.recentes = r, error: e => this.erro = mensagemErro(e) }); }

  registrar() {
    if (!this.alunoId) return;
    this.enviando = true; this.erro = '';
    this.api.registrarAcesso(this.alunoId).subscribe({
      next: r => { this.resultado = r; this.enviando = false; this.recarregar(); },
      error: e => { this.erro = mensagemErro(e); this.enviando = false; },
    });
  }
}
