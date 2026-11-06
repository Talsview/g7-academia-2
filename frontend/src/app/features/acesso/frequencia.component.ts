import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { Acesso, Aluno, MOTIVOS } from '../../core/models/models';

/**
 * Histórico de frequência com filtros por aluno e por resultado.
 */
@Component({
  selector: 'app-frequencia',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head"><h1>Histórico de frequência</h1></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    <div class="filters">
      <div><label for="al">Aluno</label>
        <select id="al" [(ngModel)]="alunoId" (change)="carregar()"><option [ngValue]="null">Todos</option>
          @for (a of alunos; track a.id) { <option [ngValue]="a.id">{{ a.nome }}</option> }</select></div>
      <div><label for="rs">Resultado</label>
        <select id="rs" [(ngModel)]="resultado" (change)="carregar()">
          <option value="">Todos</option><option>LIBERADO</option><option>BLOQUEADO</option></select></div>
    </div>
    <div class="card table-wrap" style="padding:0">
      <table>
        <thead><tr><th>Data/hora</th><th>Aluno</th><th>Resultado</th><th>Motivo do bloqueio</th></tr></thead>
        <tbody>
          @for (a of acessos; track a.id) {
            <tr><td>{{ a.dataHora | date:'dd/MM/yyyy HH:mm:ss' }}</td><td>{{ a.aluno }}</td>
              <td><span class="badge" [class]="a.resultado">{{ a.resultado }}</span></td>
              <td>{{ motivo(a.motivoBloqueio) }}</td></tr>
          } @empty { <tr><td colspan="4" class="empty">Nenhum registro encontrado.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class FrequenciaComponent implements OnInit {
  private api = inject(ApiService);
  acessos: Acesso[] = []; alunos: Aluno[] = []; alunoId: number | null = null; resultado = ''; erro = '';

  ngOnInit() {
    this.api.alunos().subscribe({ next: a => this.alunos = a, error: e => this.erro = mensagemErro(e) });
    this.carregar();
  }

  motivo(m: string | null) { return m ? (MOTIVOS[m] ?? m) : '—'; }

  carregar() { this.api.acessos(this.alunoId, this.resultado, 200).subscribe({ next: r => this.acessos = r, error: e => this.erro = mensagemErro(e) }); }
}
