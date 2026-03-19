import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  progress: number;
  gradient?: string;
  height?: number;
}

export default function ProgressBar({ progress, gradient, height = 4 }: ProgressBarProps) {
  return (
    <div className={styles.track} style={{ height }}>
      <div
        className={styles.fill}
        style={{ width: `${progress}%`, background: gradient || 'linear-gradient(90deg, var(--rose-light), var(--rose))' }}
      />
    </div>
  );
}
