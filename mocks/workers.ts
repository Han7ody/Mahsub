export interface Worker {
  id: string;
  name: string;
  role: "مدير" | "موظف" | "محاسب" | "أخرى";
  status: "نشط" | "موقوف";
  initials: string;
  avatarColor: string;
}

export const workers: Worker[] = [
  {
    id: "1",
    name: "محمد أحمد",
    role: "مدير",
    status: "نشط",
    initials: "م أ",
    avatarColor: "emerald",
  },
  {
    id: "2",
    name: "عثمان سليمان",
    role: "موظف",
    status: "نشط",
    initials: "ع س",
    avatarColor: "slate",
  },
  {
    id: "3",
    name: "سامي علي",
    role: "موظف",
    status: "موقوف",
    initials: "س ع",
    avatarColor: "red",
  },
  {
    id: "4",
    name: "إبراهيم خالد",
    role: "موظف",
    status: "نشط",
    initials: "إ خ",
    avatarColor: "amber",
  },
  {
    id: "5",
    name: "منى محمود",
    role: "محاسب",
    status: "نشط",
    initials: "م م",
    avatarColor: "blue",
  },
  {
    id: "6",
    name: "عادل حسن",
    role: "موظف",
    status: "نشط",
    initials: "ع ح",
    avatarColor: "purple",
  },
];
