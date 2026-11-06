import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensagemErro } from '../../core/services/api.service';

/**
 * Formulário de cadastro e edição de planos (rota restrita ao ADMIN).
 */
@Component({
  selector: 'app-plano-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-head"><h1>{{ id ? 'Editar plano' : 'Novo plano' }}</h1></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    <form class="card" [formGroup]="form" (ngSubmit)="salvar()">
      <div class="form-grid">
        <div class="field" [class.invalid]="inv('nome')"><label for="nome">Nome *</label>
          <input id="nome" formControlName="nome" maxlength="60" />
          @if (inv('nome')) { <div class="err">Informe o nome do plano.</div> }</div>
        <div class="field" [class.invalid]="inv('valorMensal')"><label for="valor">Valor mensal (R$) *</label>
          <input id="valor" type="number" step="0.01" formControlName="valorMensal" />
          @if (inv('valorMensal')) { <div class="err">Informe um valor maior que zero.</div> }</div>
        <div class="field" [class.invalid]="inv('duracaoMeses')"><label for="dur">Duração (meses) *</label>
          <input id="dur" type="number" formControlName="duracaoMeses" />
          @if (inv('duracaoMeses')) { <div class="err">Informe a duração (mínimo 1).</div> }</div>
        <div class="field"><label for="ativo">Situação</label>
          <select id="ativo" formControlName="ativo"><option [ngValue]="true">Ativo</option><option [ngValue]="false">Inativo</option></select></div>
      </div>
      <div class="field" style="margin-top:.9rem"><label for="desc">Descrição</label>
        <textarea id="desc" rows="2" formControlName="descricao" maxlength="255"></textarea></div>
      <div class="actions" style="margin-top:1.2rem">
        <button class="btn" [disabled]="salvando">Salvar</button>
        <a class="btn secondary" routerLink="/planos">Cancelar</a>
      </div>
    </form>
  `,
})
export class PlanoFormComponent implements OnInit {
  @Input() id?: string;
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  erro = ''; salvando = false;
  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    descricao: [''],
    valorMensal: [0, [Validators.required, Validators.min(0.01)]],
    duracaoMeses: [1, [Validators.required, Validators.min(1)]],
    ativo: [true],
  });

  inv(c: string) { const x = this.form.get(c)!; return x.invalid && (x.touched || x.dirty); }

  ngOnInit() {
    if (this.id) this.api.plano(+this.id).subscribe({
      next: p => this.form.patchValue({ nome: p.nome, descricao: p.descricao ?? '', valorMensal: p.valorMensal, duracaoMeses: p.duracaoMeses, ativo: p.ativo }),
      error: e => this.erro = mensagemErro(e),
    });
  }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.salvando = true; this.erro = '';
    const req = this.id ? this.api.atualizarPlano(+this.id, v) : this.api.criarPlano(v);
    req.subscribe({ next: () => this.router.navigate(['/planos']), error: e => { this.erro = mensagemErro(e); this.salvando = false; } });
  }
}
