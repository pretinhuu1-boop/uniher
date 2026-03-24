'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArchetypeKey } from '@/types';
import { ARCHETYPES } from '@/data/archetypes';
import styles from './QuizAnalyzing.module.css';

interface QuizAnalyzingProps {
  archetype: ArchetypeKey;
  onComplete: () => void;
}

const STEPS = ['Analisando', 'Calculando', 'Otimizando', 'Finalizando'];

export default function QuizAnalyzing({ archetype, onComplete }: QuizAnalyzingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [missions, setMissions] = useState(0);
  const [campaigns, setCampaigns] = useState(0);
  const [habits, setHabits] = useState(0);

  const arch = ARCHETYPES[archetype];

  // Step progression
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 3) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    return () => clearInterval(interval);
  }, []);

  // Progress bar
  useEffect(() => {
    const targetProgress = ((currentStep + 1) / 4) * 100;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) {
          clearInterval(interval);
          return targetProgress;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [currentStep]);

  // Stat counters animation
  useEffect(() => {
    if (currentStep < 2) return;

    const duration = 800;
    const steps = 20;
    const stepTime = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const ratio = step / steps;
      setMissions(Math.round(arch.missions * ratio));
      setCampaigns(Math.round(arch.campaigns * ratio));
      setHabits(Math.round(arch.habits * ratio));

      if (step >= steps) clearInterval(interval);
    }, stepTime);

    return () => clearInterval(interval);
  }, [currentStep, arch]);

  // Complete callback
  useEffect(() => {
    if (currentStep >= 3) {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentStep, onComplete]);

  return (
    <div className={styles.wrapper}>
      {/* Spinner with Lotus */}
      <div className={styles.spinnerWrap}>
        <div className={styles.spinnerRing} />
        <Image className={styles.lotus} src="/logo-uniher.png" alt="" width={36} height={30} style={{ width: 36, height: 'auto', objectFit: 'contain' }} />
      </div>

      {/* Title */}
      <h3 className={styles.title}>
        <span className={styles.titleAccent}>IA</span> Analisando seu Perfil
      </h3>
      <p className={styles.subtitle}>Preparando sua jornada personalizada...</p>

      {/* Steps */}
      <div className={styles.steps}>
        {STEPS.map((label, i) => (
          <div key={label} className={styles.stepItem}>
            <div
              className={`${styles.stepCircle} ${
                i <= currentStep ? styles.stepCircleActive : ''
              }`}
            >
              {i <= currentStep ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6l2.5 2.5L9.5 4"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className={styles.stepDot} />
              )}
            </div>
            <span
              className={`${styles.stepLabel} ${
                i <= currentStep ? styles.stepLabelActive : ''
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={styles.progressPct}>{Math.round(progress)}%</span>
      </div>

      {/* Stat Counters */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={`${styles.statValue} ${styles.statRose}`}>{missions}</span>
          <span className={styles.statLabel}>Missões</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statValue} ${styles.statGold}`}>{campaigns}</span>
          <span className={styles.statLabel}>Campanhas</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statValue} ${styles.statGreen}`}>{habits}</span>
          <span className={styles.statLabel}>Hábitos</span>
        </div>
      </div>
    </div>
  );
}
