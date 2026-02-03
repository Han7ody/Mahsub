export type SupplierStatus = "debt" | "clear" | "credit";

export interface DashboardSupplier {
  id: number;
  name: string;
  phone: string;
  initials: string;
  status: SupplierStatus;
  amount: number;
  lastActivity: string;
  avatar_url?: string | null;
  notes?: string;
}

export const suppliers: DashboardSupplier[] = [
  {
    id: 1,
    name: "شركة النيل للمواد الغذائية",
    phone: "0998765432",
    initials: "ن غ",
    status: "debt",
    amount: 85000,
    lastActivity: "منذ يومين",
  },
  {
    id: 2,
    name: "مؤسسة الخرطوم التجارية",
    phone: "0123456789",
    initials: "خ ت",
    status: "clear",
    amount: 0,
    lastActivity: "أمس",
  },
  {
    id: 3,
    name: "محمد أحمد للتوريدات",
    phone: "0912345678",
    initials: "م أ",
    status: "debt",
    amount: 120000,
    lastActivity: "منذ ساعتين",
  },
  {
    id: 4,
    name: "الشركة السودانية للمشروبات",
    phone: "0112233445",
    initials: "س م",
    status: "credit",
    amount: 15000,
    lastActivity: "منذ 5 أيام",
  },
];
