export type UserRole = 'mukallaf' | 'amin' | 'rais';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  balance: number;
}

export interface Subscriber {
  id: string;
  name: string;
  phone?: string;
  nationalId?: string;
  subscriptionDate: string;
  subscriptionFeePaid: number;
  balance: number;
  createdBy?: string;
}

export interface IrrigationSession {
  id: string;
  subscriberId: string;
  subscriberName: string;
  hours: number;
  rate: number;
  totalAmount: number;
  workerWage: number;
  date: string;
  status: 'paid' | 'cancelled';
  collectedBy: string;
  receiptNumber: string;
  createdBy?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  addedBy: string;
  createdBy?: string;
}

export interface Transfer {
  id: string;
  fromUid: string;
  toUid: string;
  amount: number;
  date: string;
  createdBy?: string;
}
