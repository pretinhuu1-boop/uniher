'use client';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { DIMENSIONS } from '@/data/questions';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface RadarChartProps {
  before: number[];
  after: number[];
}

export default function RadarChart({ before, after }: RadarChartProps) {
  const data = {
    labels: DIMENSIONS,
    datasets: [
      {
        label: 'Hoje',
        data: before,
        borderColor: '#C9A264',
        backgroundColor: 'rgba(200, 92, 126, 0.10)',
        borderWidth: 2,
        pointBackgroundColor: '#C9A264',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'UniHER',
        data: after,
        borderColor: '#B8922A',
        backgroundColor: 'rgba(184, 146, 42, 0.10)',
        borderWidth: 2,
        pointBackgroundColor: '#B8922A',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' as const },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          font: { size: 10 },
          color: '#A48090',
          backdropColor: 'transparent',
        },
        grid: { color: 'rgba(180, 130, 150, 0.15)' },
        pointLabels: {
          font: { size: 11, family: "'DM Sans', sans-serif" },
          color: '#6B4D57',
        },
        angleLines: { color: 'rgba(180, 130, 150, 0.15)' },
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '260px' }}>
      <Radar data={data} options={options} />
    </div>
  );
}
