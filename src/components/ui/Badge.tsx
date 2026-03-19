import styles from './Badge.module.css';

interface BadgeProps {
  status: 'done' | 'active' | 'next';
  children: React.ReactNode;
}

export default function Badge({ status, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[status]}`}>{children}</span>;
}
