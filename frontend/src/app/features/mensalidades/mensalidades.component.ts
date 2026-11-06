import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../../core/services/api.service';
import { Aluno, Matricula, Mensalidade } from '../../core/models/models';

type Acao = { tipo: 'pagar' | 'vencimento' | 'nova'; m?: Mensalidade };

/**
 * Gestão de mensalidades: pagar, alterar vencimento (com justificativa auditada), cancelar e lançar
 * avulsa.
 */
@Component({
  selector: 'app-mensalidades',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="page-head"><h1>Mensalidades</h1>
      <button class="btn" (click)="abrirNova()">Nova mensalidade</button></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    @if (info) { <div class="alert success">{{ info }}</div> }
    <div class="filters">
      <div><label for="fa">Aluno</label>
        <select id="fa" [(ngModel)]="alunoId" (change)="carregar()"><option [ngValue]="null">Todos</option>
          @for (a of alunos; track a.id) { <option [ngValue]="a.id">{{ a.nome }}</option> }</select></div>
      <div><label for="fs">Situação</label>
        <select id="fs" [(ngModel)]="status" (change)="carregar()">
          <option value="">Todas</option><option>PENDENTE</option><option>ATRASADA</option><option>PAGA</option><option>CANCELADA</option></select></div>
    </div>

    @if (acao) {
      <div class="card">
        @switch (acao.tipo) {
          @case ('pagar') {
            <h2>Registrar pagamento — {{ acao.m!.aluno }} ({{ acao.m!.competencia | date:'MM/yyyy' }})</h2>
            <div class="form-grid">
              <div><label for="vp">Valor pago (R$)</label><input id="vp" type="number" step="0.01" [(ngModel)]="valorPago" /></div>
              <div><label for="fp">Forma de pagamento</label>
                <select id="fp" [(ngModel)]="forma"><option>PIX</option><option>DINHEIRO</option><option>CARTAO</option><option>BOLETO</option></select></div>
              <div><label for="dp">Data do pagamento</label><input id="dp" type="date" [(ngModel)]="dataPagamento" /></div>
            </div>
          }
          @case ('vencimento') {
            <h2>Alterar vencimento — {{ acao.m!.aluno }} (atual: {{ acao.m!.dataVencimento | date:'dd/MM/yyyy' }})</h2>
            <div class="form-grid">
              <div><label for="nv">Novo vencimento</label><input id="nv" type="date" [(ngModel)]="novoVenc" /></div>
              <div><label for="ju">Justificativa</label><input id="ju" [(ngModel)]="justificativa" maxlength="255" /></div>
            </div>
            <p style="color:var(--muted);font-size:.85rem">A alteração gera um registro de auditoria automaticamente (trigger no banco).</p>
          }
          @case ('nova') {
            <h2>Nova mensalidade avulsa</h2>
            <div class="form-grid">
              <div><label for="mt">Matrícula ativa</label>
                <select id="mt" [(ngModel)]="matriculaId"><option [ngValue]="null">Selecione</option>
                  @for (m of matriculas; track m.id) { <option [ngValue]="m.id">{{ m.aluno }} — {{ m.plano }}</option> }</select></div>
              <div><label for="cp">Competência</label><input id="cp" type="date" [(ngModel)]="competencia" /></div>
              <div><label for="vl">Valor (R$)</label><input id="vl" type="number" step="0.01" [(ngModel)]="valor" /></div>
              <div><label for="vc">Vencimento</label><input id="vc" type="date" [(ngModel)]="vencimento" /></div>
            </div>
          }
        }
        <div class="actions" style="margin-top:1rem">
          <button class="btn" (click)="confirmar()">Confirmar</button>
          <button class="btn secondary" (click)="acao = undefined">Cancelar</button></div>
      </div>
    }

    <div class="card table-wrap" style="padding:0">
      <table>
        <thead><tr><th>Aluno</th><th>Plano</th><th>Competência</th><th class="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Situação</th><th class="num">Dias em atraso</th><th></th></tr></thead>
        <tbody>
          @for (m of mensalidades; track m.id) {
            <tr><td>{{ m.aluno }}</td><td>{{ m.plano }}</td><td>{{ m.competencia | date:'MM/yyyy' }}</td>
              <td class="num">{{ m.valor | currency:'BRL' }}</td><td>{{ m.dataVencimento | date:'dd/MM/yyyy' }}</td>
              <td>{{ m.dataPagamento ? (m.dataPagamento | date:'dd/MM/yyyy') : '—' }}</td>
              <td><span class="badge" [class]="m.status">{{ m.status }}</span></td>
              <td class="num">{{ m.diasAtraso || '' }}</td>
              <td>@if (m.status === 'PENDENTE' || m.status === 'ATRASADA') {
                <div class="actions">
                  <button class="btn sm" (click)="abrir('pagar', m)">Pagar</button>
                  <button class="btn secondary sm" (click)="abrir('vencimento', m)">Vencimento</button>
                  <button class="btn danger sm" (click)="cancelar(m)">Cancelar</button></div> }</td></tr>
          } @empty { <tr><td colspan="9" class="empty">Nenhuma mensalidade encontrada.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class MensalidadesComponent implements OnInit {
  private api = inject(ApiService);
  mensalidades: Mensalidade[] = []; alunos: Aluno[] = []; matriculas: Matricula[] = [];
  alunoId: number | null = null; status = ''; erro = ''; info = ''; acao?: Acao;
  valorPago = 0; forma = 'PIX'; dataPagamento = ''; novoVenc = ''; justificativa = '';
  matriculaId: number | null = null; competencia = ''; valor = 0; vencimento = '';

  ngOnInit() {
    this.carregar();
    this.api.alunos().subscribe({ next: a => this.alunos = a, error: e => this.erro = mensagemErro(e) });
  }

  carregar() { this.api.mensalidades(this.alunoId, this.status).subscribe({ next: m => this.mensalidades = m, error: e => this.erro = mensagemErro(e) }); }

  abrir(tipo: 'pagar' | 'vencimento', m: Mensalidade) {
    this.acao = { tipo, m }; this.erro = ''; this.info = '';
    this.valorPago = m.valor; this.forma = 'PIX'; this.dataPagamento = ''; this.novoVenc = m.dataVencimento; this.justificativa = '';
  }

  abrirNova() {
    this.acao = { tipo: 'nova' }; this.erro = ''; this.info = '';
    this.matriculaId = null; this.competencia = ''; this.valor = 0; this.vencimento = '';
    this.api.matriculas(null, 'ATIVA').subscribe({ next: m => this.matriculas = m, error: e => this.erro = mensagemErro(e) });
  }

  confirmar() {
    const a = this.acao; if (!a) return;
    const ok = (msg: string) => () => { this.info = msg; this.acao = undefined; this.carregar(); };
    const fail = (e: any) => this.erro = mensagemErro(e);
    this.erro = '';
    if (a.tipo === 'pagar') {
      this.api.pagar(a.m!.id, { valorPago: this.valorPago, formaPagamento: this.forma, dataPagamento: this.dataPagamento || undefined })
        .subscribe({ next: ok('Pagamento registrado.'), error: fail });
    } else if (a.tipo === 'vencimento') {
      this.api.alterarVencimento(a.m!.id, { novoVencimento: this.novoVenc, justificativa: this.justificativa || undefined })
        .subscribe({ next: ok('Vencimento alterado e registrado na auditoria.'), error: fail });
    } else {
      if (!this.matriculaId || !this.competencia || !this.vencimento || this.valor <= 0) { this.erro = 'Preencha todos os campos da mensalidade.'; return; }
      this.api.criarMensalidade({ matriculaId: this.matriculaId, competencia: this.competencia, valor: this.valor, dataVencimento: this.vencimento })
        .subscribe({ next: ok('Mensalidade lançada.'), error: fail });
    }
  }

  cancelar(m: Mensalidade) {
    if (!confirm('Cancelar esta mensalidade?')) return;
    this.api.cancelarMensalidade(m.id).subscribe({ next: () => { this.info = 'Mensalidade cancelada.'; this.carregar(); }, error: e => this.erro = mensagemErro(e) });
  }
}
