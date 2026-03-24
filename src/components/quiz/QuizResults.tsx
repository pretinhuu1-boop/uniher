'use client';

import { useState } from 'react';
import { ArchetypeKey } from '@/types';
import { ARCHETYPES } from '@/data/archetypes';
import { getProjection, averageScore } from '@/lib/quiz-engine';
import QuizResultsChart from './QuizResultsChart';
import QuizResultsSummary from './QuizResultsSummary';
import styles from './QuizResults.module.css';

interface QuizResultsProps {
  archetype: ArchetypeKey;
}

type DayOption = 30 | 60 | 90;

export default function QuizResults({ archetype }: QuizResultsProps) {
  const [selectedDay, setSelectedDay] = useState<DayOption>(90);
  const arch = ARCHETYPES[archetype];
  const projection = getProjection(archetype, selectedDay);
  const beforeAvg = averageScore(arch.base);
  const afterAvg = averageScore(projection);

  return (
    <div className={styles.wrapper}>
      {/* Archetype Card */}
      <div className={styles.archetypeCard}>
        <span className={styles.archetypeEyebrow}>Seu Perfil UniHER</span>
        <h2 className={styles.archetypeName}>{arch.name}</h2>
        <p className={styles.archetypeDesc}>{arch.description}</p>
        <div className={styles.scorePill}>
          <span className={styles.scorePillLabel}>Score atual</span>
          <span className={styles.scorePillValue}>{beforeAvg}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.scorePillValue}>{afterAvg}</span>
        </div>
      </div>

      {/* Transformation Section */}
      <div className={styles.transformSection}>
        <h3 className={styles.sectionTitle}>Sua Transformação</h3>

        {/* Day Tabs */}
        <div className={styles.dayTabs}>
          {([30, 60, 90] as DayOption[]).map(day => (
            <button
              key={day}
              className={`${styles.dayTab} ${selectedDay === day ? styles.dayTabActive : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day} dias
            </button>
          ))}
        </div>

        <QuizResultsChart
          base={arch.base}
          projection={projection}
          beforeAvg={beforeAvg}
          afterAvg={afterAvg}
          selectedDay={selectedDay}
        />
      </div>

      {/* CTA / Lead Form / Success */}
      <QuizResultsSummary
        archName={arch.name}
        beforeAvg={beforeAvg}
        afterAvg={afterAvg}
        selectedDay={selectedDay}
      />
    </div>
  );
}
