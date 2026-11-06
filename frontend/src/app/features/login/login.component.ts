import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { mensagemErro } from '../../core/services/api.service';

/**
 * Tela de login com validação do formulário e exibição do erro devolvido pela API.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="wrap">
      <form class="card" [formGroup]="form" (ngSubmit)="entrar()">
        <h1>G7 Academia</h1>
        <p class="sub">Acesso restrito a operadores cadastrados</p>
        @if (erro) { <div class="alert error">{{ erro }}</div> }
        <div class="field" [class.invalid]="invalido('email')">
          <label for="email">E-mail</label>
          <input id="email" type="email" formControlName="email" autocomplete="username" />
          @if (invalido('email')) { <div class="err">Informe um e-mail válido.</div> }
        </div>
        <div class="field" [class.invalid]="invalido('senha')" style="margin-top:.9rem">
          <label for="senha">Senha</label>
          <input id="senha" type="password" formControlName="senha" autocomplete="current-password" />
          @if (invalido('senha')) { <div class="err">Informe a senha.</div> }
        </div>
        <button class="btn" style="width:100%;margin-top:1.2rem" [disabled]="carregando">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    form { width: 100%; max-width: 380px; padding: 1.6rem; }
    .sub { color: var(--muted); margin: 0 0 1.2rem; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], senha: ['', Validators.required] });
  erro = ''; carregando = false;

  invalido(c: 'email' | 'senha') { const x = this.form.controls[c]; return x.invalid && (x.touched || x.dirty); }

  entrar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.carregando = true; this.erro = '';
    const { email, senha } = this.form.getRawValue();
    this.auth.login(email, senha).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: e => { this.erro = mensagemErro(e); this.carregando = false; },
    });
  }
}
