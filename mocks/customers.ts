export type CustomerStatus = "debt" | "clear" | "credit";

export interface DashboardCustomer {
  id: number;
  name: string;
  phone: string;
  initials: string;
  status: CustomerStatus;
  amount: number;
  lastActivity: string;
  // Matching real DB schema
  opening_balance?: number;
  opening_balance_direction?: 'in' | 'out' | null;
  current_balance?: number;
  avatar_url?: string | null;
  notes?: string;
  created_at?: string;
}

export const customers: DashboardCustomer[] = [
  {
    id: 1,
    name: "ياسر علي حسن",
    phone: "0998765432",
    initials: "ي ع",
    status: "debt",
    amount: 12500,
    lastActivity: "منذ يومين",
  },
  {
    id: 2,
    name: "عمر خالد إبراهيم",
    phone: "0123456789",
    initials: "ع خ",
    status: "clear",
    amount: 0,
    lastActivity: "أمس",
  },
  {
    id: 3,
    name: "أحمد محمد عثمان",
    phone: "0912345678",
    initials: "أ م",
    status: "debt",
    amount: 50000,
    lastActivity: "منذ ساعتين",
  },
  {
    id: 4,
    name: "مصطفى محمود",
    phone: "0112233445",
    initials: "م م",
    status: "credit",
    amount: 3200,
    lastActivity: "منذ 5 أيام",
  },
];
