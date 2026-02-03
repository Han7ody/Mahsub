// Demo data for Mahsub app - Stores version only
// This is temporary mock data for demonstration purposes

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number; // positive = they owe us, negative = we owe them
  lastTransaction: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: "sale" | "payment" | "debt";
  amount: number;
  description: string;
  date: string;
}

export const demoCustomers: Customer[] = [
  {
    id: "1",
    name: "محمد أحمد",
    phone: "+249912345678",
    balance: 5000,
    lastTransaction: "2024-01-08",
  },
  {
    id: "2",
    name: "فاطمة عبدالله",
    phone: "+249923456789",
    balance: 2500,
    lastTransaction: "2024-01-09",
  },
  {
    id: "3",
    name: "عمر حسن",
    phone: "+249934567890",
    balance: -1000,
    lastTransaction: "2024-01-07",
  },
];

export const demoTransactions: Transaction[] = [
  {
    id: "1",
    customerId: "1",
    type: "sale",
    amount: 5000,
    description: "بيع بضاعة - أرز وسكر",
    date: "2024-01-08",
  },
  {
    id: "2",
    customerId: "2",
    type: "debt",
    amount: 2500,
    description: "دين - مواد غذائية",
    date: "2024-01-09",
  },
  {
    id: "3",
    customerId: "3",
    type: "payment",
    amount: 1000,
    description: "سداد جزئي",
    date: "2024-01-07",
  },
];

export const demoStats = {
  totalDebts: 7500,
  totalPayments: 1000,
  dailyTransactions: 10000,
  activeCustomers: 1000,
};
