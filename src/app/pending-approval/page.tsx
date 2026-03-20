import Link from 'next/link';

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function PendingApprovalPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-8 text-white text-center">
          <div className="text-5xl mb-3">🌸</div>
          <h1 className="text-2xl font-display font-bold">Cadastro realizado!</h1>
        </div>

        {/* Body */}
        <div className="p-8 text-center space-y-4">
          <p className="text-uni-text-700 text-base leading-relaxed">
            Aguardando aprovação da sua gestora para acessar a plataforma.
          </p>

          {email && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-uni-text-700">
              <span className="text-uni-text-500">Email cadastrado:</span>{' '}
              <span className="font-bold text-uni-text-900">{email}</span>
            </div>
          )}

          <p className="text-xs text-uni-text-400 pt-2">
            Você receberá uma notificação assim que sua gestora aprovar seu acesso.
          </p>

          <Link
            href="/auth"
            className="mt-4 inline-block w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 active:scale-95 transition-all text-sm text-center"
          >
            Já aprovada? Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
