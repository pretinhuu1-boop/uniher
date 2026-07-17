'use client';

import { useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'uniher-pwa-install-dismissed-at';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type PromptMode = 'hidden' | 'install' | 'ios' | 'https';

function wasDismissedRecently() {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) && Date.now() - timestamp < DISMISS_TTL_MS;
}

function markDismissed() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;
}

export function PwaInstallPrompt() {
  const [mode, setMode] = useState<PromptMode>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const httpsUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    if (window.location.protocol === 'https:') return window.location.href;
    return `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (wasDismissedRecently() || isStandaloneMode()) return;

    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isSecureOrigin = window.isSecureContext || isLocalhost;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isiOS =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isSafari =
      /safari/.test(userAgent) &&
      !/chrome|crios|edg|edgios|fxios|firefox|opr|opera|android/.test(userAgent);

    if (!isSecureOrigin) {
      setMode('https');
    } else if (isiOS && isSafari) {
      setMode('ios');
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      setMode('install');
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setMode('hidden');
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    markDismissed();
    setDeferredPrompt(null);
    setMode('hidden');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setMode('hidden');
      setDeferredPrompt(null);
      return;
    }
    dismiss();
  };

  if (mode === 'hidden' || isStandaloneMode()) return null;

  const title =
    mode === 'install'
      ? 'Instale o app UniHER'
      : mode === 'ios'
        ? 'Adicionar a tela inicial'
        : 'Instalacao disponivel na versao segura';

  const description =
    mode === 'install'
      ? 'Abra mais rapido, com experiencia de app e acesso direto pela tela inicial.'
      : mode === 'ios'
        ? 'No iPhone, a instalacao e manual. Use o Safari para adicionar o app a tela inicial.'
        : 'Neste endereco em HTTP o navegador nao libera a instalacao do app.';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-[#e7dcca] bg-white/95 p-4 shadow-[0_18px_40px_rgba(34,27,20,0.16)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#fbf4e8] text-xl">
            {mode === 'install' ? '📲' : mode === 'ios' ? '🍎' : '🔒'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#2e2a25]">{title}</p>
            <p className="mt-1 text-sm leading-5 text-[#6e6257]">{description}</p>

            {mode === 'ios' && (
              <div className="mt-3 rounded-2xl bg-[#faf7f2] px-3 py-3 text-sm text-[#5d534b]">
                <p>1. Toque em <strong>Compartilhar</strong> no Safari.</p>
                <p>2. Escolha <strong>Adicionar a Tela de Inicio</strong>.</p>
              </div>
            )}

            {mode === 'https' && httpsUrl && (
              <div className="mt-3 rounded-2xl bg-[#faf7f2] px-3 py-3 text-sm text-[#5d534b]">
                Abra a versao segura para instalar: <strong>{httpsUrl}</strong>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {mode === 'install' && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="rounded-full bg-[#c9a264] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#b48d52]"
                >
                  Instalar app
                </button>
              )}

              {mode === 'https' && httpsUrl && (
                <a
                  href={httpsUrl}
                  className="rounded-full bg-[#c9a264] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#b48d52]"
                >
                  Abrir versao segura
                </a>
              )}

              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-[#e7dcca] px-4 py-2 text-sm font-semibold text-[#6e6257] transition hover:bg-[#faf7f2]"
              >
                Agora nao
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
