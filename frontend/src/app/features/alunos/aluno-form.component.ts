import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensagemErro } from '../../core/services/api.service';

/**
 * Formulário de cadastro e edição de alunos (mesmo componente para as duas rotas) com validação de
 * CPF.
 */
@Component({
  selector: 'app-aluno-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-head"><h1>{{ id ? 'Editar aluno' : 'Novo aluno' }}</h1></div>
    @if (erro) { <div class="alert error">{{ erro }}</div> }
    <form class="card" [formGroup]="form" (ngSubmit)="salvar()">
      <div class="form-grid">
        <div class="field" [class.invalid]="inv('nome')"><label for="nome">Nome completo *</label>
          <input id="nome" formControlName="nome" maxlength="150" />
          @if (inv('nome')) { <div class="err">Informe o nome.</div> }</div>
        <div class="field" [class.invalid]="inv('cpf')"><label for="cpf">CPF * (11 dígitos)</label>
          <input id="cpf" formControlName="cpf" maxlength="14" inputmode="numeric" />
          @if (inv('cpf')) { <div class="err">CPF deve ter 11 dígitos numéricos.</div> }</div>
        <div class="field" [class.invalid]="inv('dataNascimento')"><label for="nasc">Data de nascimento *</label>
          <input id="nasc" type="date" formControlName="dataNascimento" />
          @if (inv('dataNascimento')) { <div class="err">Informe a data de nascimento.</div> }</div>
        <div class="field"><label for="tel">Telefone</label><input id="tel" formControlName="telefone" maxlength="20" /></div>
        <div class="field" [class.invalid]="inv('email')"><label for="email">E-mail</label>
          <input id="email" type="email" formControlName="email" />
          @if (inv('email')) { <div class="err">E-mail inválido.</div> }</div>
      </div>
      <div class="actions" style="margin-top:1.2rem">
        <button class="btn" [disabled]="salvando">Salvar</button>
        <a class="btn secondary" routerLink="/alunos">Cancelar</a>
      </div>
    </form>
  `,
})
export class AlunoFormComponent implements OnInit {
  @Input() id?: string;
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  erro = ''; salvando = false;
  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)]],
    dataNascimento: ['', Validators.required],
    telefone: [''], email: ['', Validators.email],
  });

  inv(c: string) { const x = this.form.get(c)!; return x.invalid && (x.touched || x.dirty); }

  ngOnInit() {
    if (this.id) this.api.aluno(+this.id).subscribe({
      next: a => this.form.patchValue({ nome: a.nome, cpf: a.cpf, dataNascimento: a.dataNascimento, telefone: a.telefone ?? '', email: a.email ?? '' }),
      error: e => this.erro = mensagemErro(e),
    });
  }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body = { nome: v.nome, cpf: v.cpf.replace(/\D/g, ''), dataNascimento: v.dataNascimento, telefone: v.telefone || null, email: v.email || null };
    this.salvando = true; this.erro = '';
    const req = this.id ? this.api.atualizarAluno(+this.id, body) : this.api.criarAluno(body);
    req.subscribe({ next: () => this.router.navigate(['/alunos']), error: e => { this.erro = mensagemErro(e); this.salvando = false; } });
  }
}
