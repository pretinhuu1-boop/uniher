import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Montserrat } from 'next/font/google';
import AuthProvider from '@/components/platform/AuthProvider';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--ff-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: '--ff-body',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const SITE_URL = 'https://uniher.com.br';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C9A264',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'UniHER — Saúde Feminina Corporativa | Gamificação & ROI para RH',
    template: '%s | UniHER',
  },
  description:
    'Plataforma SaaS de saúde feminina corporativa. Gamificação, prevenção e IA personalizada para engajar colaboradoras e entregar ROI mensurável para o RH. O Duolingo da saúde feminina no trabalho.',
  keywords: [
    'saúde feminina corporativa',
    'wellness corporativo',
    'gamificação saúde',
    'ROI saúde ocupacional',
    'UniHER',
    'saúde da mulher no trabalho',
    'bem-estar colaboradoras',
    'plataforma RH saúde',
    'prevenção saúde mulher',
    'absenteísmo feminino',
    'saúde ocupacional mulheres',
    'benefícios corporativos saúde',
  ],
  authors: [{ name: 'UniHER', url: SITE_URL }],
  creator: 'UniHER',
  publisher: 'UniHER',
  category: 'health',
  alternates: {
    canonical: '/',
    languages: { 'pt-BR': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'UniHER',
    title: 'UniHER — O Duolingo da Saúde Feminina no Trabalho',
    description:
      'Plataforma gamificada que transforma o cuidado com a saúde da mulher em hábitos diários — reduzindo absenteísmo em 23%, aumentando engajamento em 92% e entregando ROI de 4.8x.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'UniHER — Plataforma de Saúde Feminina Corporativa com Gamificação',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UniHER — Saúde Feminina Corporativa',
    description:
      'Gamificação + IA para saúde feminina no trabalho. ROI 4.8x, -23% absenteísmo, 92% engajamento.',
    images: ['/og-image.svg'],
    creator: '@uniher',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add these when you have the verification codes:
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'UniHER',
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.svg`,
    description: 'Plataforma SaaS de saúde feminina corporativa com gamificação e IA personalizada.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      availableLanguage: ['Portuguese'],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'UniHER',
    url: SITE_URL,
    description: 'O Duolingo da Saúde Feminina no Trabalho',
    inLanguage: 'pt-BR',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'UniHER',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    description:
      'Plataforma gamificada de saúde feminina corporativa que reduz absenteísmo em 23% e entrega ROI de 4.8x para o RH.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: 'Diagnóstico gratuito disponível',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'O que é o UniHER?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniHER é uma plataforma SaaS de saúde feminina corporativa que usa gamificação, IA personalizada e ciência comportamental para engajar colaboradoras e entregar ROI mensurável para o RH.',
        },
      },
      {
        '@type': 'Question',
        name: 'Qual o ROI do UniHER?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'O UniHER entrega ROI de 4.8x, com redução de 23% no absenteísmo, economia média de R$287k e 92% de engajamento entre as colaboradoras.',
        },
      },
      {
        '@type': 'Question',
        name: 'Como funciona a gamificação do UniHER?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'O UniHER usa streaks diários, badges, arena entre departamentos e semáforo de saúde para manter as colaboradoras engajadas. A plataforma é baseada em 3 pilares científicos: neuroplasticidade temporal, loop de dopamina controlada e intenções de implementação.',
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="UniHER" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className={`${playfair.variable} ${montserrat.variable}`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg"
        >
          Ir para conteúdo principal
        </a>
        <ServiceWorkerRegistration />
        <PwaInstallPrompt />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
