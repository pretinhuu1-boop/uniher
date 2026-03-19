'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/layout/Navbar';
import Marquee from '@/components/layout/Marquee';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Profiles from '@/components/sections/Profiles';
import HowItWorks from '@/components/sections/HowItWorks';

const Gamification = dynamic(() => import('@/components/sections/Gamification'));
const ROI = dynamic(() => import('@/components/sections/ROI'));
const Campaigns = dynamic(() => import('@/components/sections/Campaigns'));
const QuizPromo = dynamic(() => import('@/components/sections/QuizPromo'));
const Pillars = dynamic(() => import('@/components/sections/Pillars'));
const QuizModal = dynamic(() => import('@/components/quiz/QuizModal'), { ssr: false });

export default function HomeClient() {
  const [quizOpen, setQuizOpen] = useState(false);

  const openQuiz = () => setQuizOpen(true);
  const closeQuiz = () => setQuizOpen(false);

  return (
    <>
      <Navbar onQuizOpen={openQuiz} />
      <main>
        <Hero onQuizOpen={openQuiz} />
        <Marquee />
        <Profiles />
        <HowItWorks />
        <Gamification />
        <ROI onQuizOpen={openQuiz} />
        <Campaigns />
        <QuizPromo onQuizOpen={openQuiz} />
        <Pillars />
      </main>
      <Footer />
      <QuizModal isOpen={quizOpen} onClose={closeQuiz} />
    </>
  );
}
