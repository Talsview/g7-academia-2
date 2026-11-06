import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { Aluno, Matricula, Plano } from '../../core/models/models';

/**
 * Gestão de matrículas: registrar (gera as mensalidades), filtrar e registrar alterações contratuais.
 */
@Component({
  selector: 'app-matriculas',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
  template: `
    <div class="page-head"><h1>Matrículas</h1>
      <button class="btn" (click)="novo = !novo">{{ novo ? 'Fechar' : 'Nova matrícula' }}</button></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    @if (info) { <div class="alert success">{{ info }}</div> }

    @if (novo) {
      <form class="card" [formGroup]="form" (ngSubmit)="criar()">
        <h2>Registrar matrícula</h2>
        <div class="form-grid">
          <div class="field" [class.invalid]="inv('alunoId')"><label for="al">Aluno *</label>
            <select id="al" formControlName="alunoId"><option [ngValue]="null">Selecione</option>
              @for (a of alunosAtivos; track a.id) { <option [ngValue]="a.id">{{ a.nome }}</option> }</select></div>
          <div class="field" [class.invalid]="inv('planoId')"><label for="pl">Plano *</label>
            <select id="pl" formControlName="planoId"><option [ngValue]="null">Selecione</option>
              @for (p of planos; track p.id) { <option [ngValue]="p.id">{{ p.nome }} — {{ p.duracaoMeses }} mês(es)</option> }</select></div>
          <div class="field" [class.invalid]="inv('dataInicio')"><label for="di">Data de início *</label>
            <input id="di" type="date" formControlName="dataInicio" /></div>
          <div class="field"><label for="ob">Observações</label><input id="ob" formControlName="observacoes" maxlength="255" /></div>
        </div>
        <p style="color:var(--muted);font-size:.85rem">O vencimento do contrato e as mensalidades são gerados a partir da duração do plano.</p>
        <button class="btn" [disabled]="salvando">Registrar</button>
      </form>
    }

    <div class="filters">
      <div><label for="fs">Situação</label>
        <select id="fs" [(ngModel)]="filtroStatus" (change)="carregar()">
          <option value="">Todas</option><option>ATIVA</option><option>CANCELADA</option><option>ENCERRADA</option></select></div>
    </div>
    <div class="card table-wrap" style="padding:0">
      <table>
        <thead><tr><th>Aluno</th><th>Plano</th><th>Início</th><th>Vencimento</th><th>Situação</th><th>Observações</th><th></th></tr></thead>
        <tbody>
          @for (m of matriculas; track m.id) {
            <tr><td>{{ m.aluno }}</td><td>{{ m.plano }}</td>
              <td>{{ m.dataInicio | date:'dd/MM/yyyy' }}</td><td>{{ m.dataVencimento | date:'dd/MM/yyyy' }}</td>
              <td><span class="badge" [class]="m.status">{{ m.status }}</span></td><td>{{ m.observacoes }}</td>
              <td><button class="btn secondary sm" (click)="editar(m)">Alterar</button></td></tr>
          } @empty { <tr><td colspan="7" class="empty">Nenhuma matrícula encontrada.</td></tr> }
        </tbody>
      </table>
    </div>

    @if (editando) {
      <div class="card">
        <h2>Alteração contratual — {{ editando.aluno }} ({{ editando.plano }})</h2>
        <div class="form-grid">
          <div><label for="es">Situação</label>
            <select id="es" [(ngModel)]="novoStatus"><option>ATIVA</option><option>CANCELADA</option><option>ENCERRADA</option></select></div>
          <div><label for="eo">Observações</label><input id="eo" [(ngModel)]="novaObs" maxlength="255" /></div>
        </div>
        <div class="actions" style="margin-top:1rem">
          <button class="btn" (click)="salvarEdicao()">Salvar</button>
          <button class="btn secondary" (click)="editando = undefined">Cancelar</button></div>
      </div>
    }
  `,
})
export class MatriculasComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  matriculas: Matricula[] = []; alunosAtivos: Aluno[] = []; planos: Plano[] = [];
  erro = ''; info = ''; novo = false; salvando = false; filtroStatus = '';
  editando?: Matricula; novoStatus = 'ATIVA'; novaObs = '';
  form = this.fb.group({
    alunoId: this.fb.control<number | null>(null, Validators.required),
    planoId: this.fb.control<number | null>(null, Validators.required),
    dataInicio: this.fb.nonNullable.control('', Validators.required),
    observacoes: this.fb.nonNullable.control(''),
  });

  inv(c: string) { const x = this.form.get(c)!; return x.invalid && (x.touched || x.dirty); }

  ngOnInit() {
    this.carregar();
    this.api.alunos('', 'ATIVO').subscribe({ next: a => this.alunosAtivos = a, error: e => this.erro = mensagemErro(e) });
    this.api.planos(true).subscribe({ next: p => this.planos = p, error: e => this.erro = mensagemErro(e) });
  }

  carregar() { this.api.matriculas(null, this.filtroStatus).subscribe({ next: m => this.matriculas = m, error: e => this.erro = mensagemErro(e) }); }

  criar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.salvando = true; this.erro = ''; this.info = '';
    this.api.criarMatricula({ alunoId: v.alunoId!, planoId: v.planoId!, dataInicio: v.dataInicio, observacoes: v.observacoes || undefined }).subscribe({
      next: m => { this.info = `Matrícula registrada para ${m.aluno}. Mensalidades geradas.`; this.novo = false; this.salvando = false; this.form.reset({ observacoes: '', dataInicio: '' }); this.carregar(); },
      error: e => { this.erro = mensagemErro(e); this.salvando = false; },
    });
  }

  editar(m: Matricula) { this.editando = m; this.novoStatus = m.status; this.novaObs = m.observacoes ?? ''; }

  salvarEdicao() {
    if (!this.editando) return;
    this.api.alterarMatricula(this.editando.id, { status: this.novoStatus, observacoes: this.novaObs || undefined }).subscribe({
      next: () => { this.info = 'Matrícula atualizada.'; this.editando = undefined; this.carregar(); },
      error: e => this.erro = mensagemErro(e),
    });
  }
}
