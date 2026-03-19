import { MockUser } from '@/types/platform';

export const MOCK_USERS: Record<string, MockUser> = {
  rh: {
    id: 'usr-rh-001',
    name: 'Paola',
    email: 'paola@uniher.com.br',
    role: 'rh',
    department: 'RH',
    level: 9,
    points: 87840,
    streak: 45,
    joinedAt: '2026-02-08',
  },
  colaboradora: {
    id: 'usr-col-001',
    name: 'Ana Maria',
    email: 'ana.silva@empresa.com',
    role: 'colaboradora',
    department: 'Marketing',
    level: 5,
    points: 2370,
    streak: 12,
    joinedAt: '2026-01-15',
  },
  lideranca: {
    id: 'usr-lid-001',
    name: 'Fernanda',
    email: 'fernanda@empresa.com',
    role: 'lideranca',
    department: 'TI',
    level: 7,
    points: 5200,
    streak: 22,
    joinedAt: '2026-01-20',
  },
};
