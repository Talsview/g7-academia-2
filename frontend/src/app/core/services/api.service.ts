import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Acesso, Aluno, AlunoForm, AuditoriaVencimento, Dashboard, Faturamento, Inadimplencia, Matricula,
  Mensalidade, Plano, PlanoForm, SituacaoFinanceira
} from '../models/models';

function params(o: Record<string, string | number | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  return p;
}

/** Acesso HTTP à API REST (nenhum dado simulado: tudo vem do backend). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Alunos
  alunos(busca?: string, status?: string): Observable<Aluno[]> { return this.http.get<Aluno[]>('/api/alunos', { params: params({ busca, status }) }); }
  aluno(id: number): Observable<Aluno> { return this.http.get<Aluno>(`/api/alunos/${id}`); }
  criarAluno(a: AlunoForm): Observable<Aluno> { return this.http.post<Aluno>('/api/alunos', a); }
  atualizarAluno(id: number, a: AlunoForm): Observable<Aluno> { return this.http.put<Aluno>(`/api/alunos/${id}`, a); }
  desativarAluno(id: number): Observable<void> { return this.http.delete<void>(`/api/alunos/${id}`); }
  reativarAluno(id: number): Observable<Aluno> { return this.http.patch<Aluno>(`/api/alunos/${id}/reativar`, {}); }
  situacao(id: number): Observable<SituacaoFinanceira> { return this.http.get<SituacaoFinanceira>(`/api/alunos/${id}/situacao-financeira`); }

  // Planos
  planos(apenasAtivos = false): Observable<Plano[]> { return this.http.get<Plano[]>('/api/planos', { params: params({ apenasAtivos: String(apenasAtivos) }) }); }
  plano(id: number): Observable<Plano> { return this.http.get<Plano>(`/api/planos/${id}`); }
  criarPlano(p: PlanoForm): Observable<Plano> { return this.http.post<Plano>('/api/planos', p); }
  atualizarPlano(id: number, p: PlanoForm): Observable<Plano> { return this.http.put<Plano>(`/api/planos/${id}`, p); }

  // Matrículas
  matriculas(alunoId?: number | null, status?: string): Observable<Matricula[]> { return this.http.get<Matricula[]>('/api/matriculas', { params: params({ alunoId, status }) }); }
  criarMatricula(m: { alunoId: number; planoId: number; dataInicio: string; observacoes?: string }): Observable<Matricula> { return this.http.post<Matricula>('/api/matriculas', m); }
  alterarMatricula(id: number, m: { status: string; observacoes?: string }): Observable<Matricula> { return this.http.patch<Matricula>(`/api/matriculas/${id}`, m); }

  // Mensalidades
  mensalidades(alunoId?: number | null, status?: string): Observable<Mensalidade[]> { return this.http.get<Mensalidade[]>('/api/mensalidades', { params: params({ alunoId, status }) }); }
  criarMensalidade(m: { matriculaId: number; competencia: string; valor: number; dataVencimento: string }): Observable<Mensalidade> { return this.http.post<Mensalidade>('/api/mensalidades', m); }
  pagar(id: number, p: { valorPago: number; formaPagamento: string; dataPagamento?: string }): Observable<Mensalidade> { return this.http.post<Mensalidade>(`/api/mensalidades/${id}/pagamento`, p); }
  cancelarMensalidade(id: number): Observable<Mensalidade> { return this.http.post<Mensalidade>(`/api/mensalidades/${id}/cancelar`, {}); }
  alterarVencimento(id: number, v: { novoVencimento: string; justificativa?: string }): Observable<Mensalidade> { return this.http.patch<Mensalidade>(`/api/mensalidades/${id}/vencimento`, v); }

  // Acessos
  registrarAcesso(alunoId: number): Observable<Acesso> { return this.http.post<Acesso>('/api/acessos', { alunoId }); }
  acessos(alunoId?: number | null, resultado?: string, limite = 100): Observable<Acesso[]> { return this.http.get<Acesso[]>('/api/acessos', { params: params({ alunoId, resultado, limite }) }); }

  // Dashboard / financeiro / auditoria
  dashboard(): Observable<Dashboard> { return this.http.get<Dashboard>('/api/dashboard'); }
  faturamento(): Observable<Faturamento[]> { return this.http.get<Faturamento[]>('/api/financeiro/faturamento'); }
  atualizarFaturamento(): Observable<Faturamento[]> { return this.http.post<Faturamento[]>('/api/financeiro/faturamento/atualizar', {}); }
  recalcularInadimplencia(): Observable<Inadimplencia> { return this.http.post<Inadimplencia>('/api/financeiro/inadimplencia/recalcular', {}); }
  auditoria(mensalidadeId?: number | null): Observable<AuditoriaVencimento[]> { return this.http.get<AuditoriaVencimento[]>('/api/auditoria/vencimentos', { params: params({ mensalidadeId }) }); }
}

/** Extrai a mensagem de erro padronizada da API. */
export function mensagemErro(e: any): string {
  const b = e?.error;
  if (b?.erro) return b.detalhes?.length ? `${b.erro}: ${b.detalhes.join('; ')}` : b.erro;
  if (e?.status === 0) return 'Não foi possível conectar ao servidor.';
  return 'Erro inesperado. Tente novamente.';
}
