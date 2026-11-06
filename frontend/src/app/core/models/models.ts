/**
 * Modelos (interfaces) que espelham os DTOs da API, mais o dicionário de motivos de bloqueio exibidos
 * na tela.
 */
export type Perfil = 'ADMIN' | 'OPERADOR';
export interface LoginResponse { token: string; nome: string; email: string; perfil: Perfil; }
export interface SessaoUsuario { nome: string; email: string; perfil: Perfil; }

export type StatusAluno = 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
export interface Aluno {
  id: number; nome: string; cpf: string; dataNascimento: string; telefone: string | null;
  email: string | null; dataCadastro: string; status: StatusAluno;
}
export type AlunoForm = Pick<Aluno, 'nome' | 'cpf' | 'dataNascimento' | 'telefone' | 'email'>;
export interface SituacaoFinanceira {
  alunoId: number; nome: string; situacaoCadastral: StatusAluno; qtdPendentes: number;
  qtdAtrasadas: number; totalEmAberto: number; inadimplente: boolean;
}

export interface Plano {
  id: number; nome: string; descricao: string | null; valorMensal: number; duracaoMeses: number;
  ativo: boolean; dataCadastro: string;
}
export type PlanoForm = Pick<Plano, 'nome' | 'descricao' | 'valorMensal' | 'duracaoMeses' | 'ativo'>;

export type StatusMatricula = 'ATIVA' | 'CANCELADA' | 'ENCERRADA';
export interface Matricula {
  id: number; alunoId: number; aluno: string; planoId: number; plano: string; dataInicio: string;
  dataVencimento: string; status: StatusMatricula; observacoes: string | null;
}

export type StatusMensalidade = 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA';
export interface Mensalidade {
  id: number; alunoId: number; aluno: string; plano: string; competencia: string; valor: number;
  dataVencimento: string; dataPagamento: string | null; valorPago: number | null;
  formaPagamento: string | null; status: StatusMensalidade; diasAtraso: number;
}

export interface Acesso {
  id: number; alunoId: number; aluno: string; dataHora: string; resultado: 'LIBERADO' | 'BLOQUEADO';
  motivoBloqueio: string | null;
}
export interface Dashboard {
  alunosAtivos: number; alunosBloqueados: number; mensalidadesPendentes: number;
  mensalidadesAtrasadas: number; recebimentosMes: number; acessosRecentes: Acesso[];
}
export interface Faturamento {
  mesReferencia: string; quantidadePagamentos: number; totalRecebido: number; valorTotalArrecadado: number;
}
export interface AuditoriaVencimento {
  id: number; mensalidadeId: number; vencimentoAnterior: string; vencimentoNovo: string;
  alteradoEm: string; usuarioResponsavel: string; justificativa: string | null;
}
export interface Inadimplencia { bloqueados: number; desbloqueados: number; }

export const MOTIVOS: Record<string, string> = {
  INADIMPLENCIA_SUPERIOR_A_5_DIAS: 'Inadimplência superior a 5 dias',
  ALUNO_INATIVO: 'Aluno inativo',
  SEM_MATRICULA_VIGENTE: 'Sem matrícula vigente',
  ALUNO_NAO_ENCONTRADO: 'Aluno não encontrado',
};
