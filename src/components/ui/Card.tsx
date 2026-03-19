import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'featured' | 'highlight';
  className?: string;
  wide?: boolean;
}

export default function Card({ children, variant = 'default', className = '', wide }: CardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]} ${wide ? styles.wide : ''} ${className}`}>
      {children}
    </div>
  );
}
