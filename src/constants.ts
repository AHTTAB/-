import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Default values if not set in Firestore
export let SUBSCRIPTION_FEE = 300;
export let IRRIGATION_RATE = 45;
export let WORKER_WAGE_PER_HOUR = 12;

export const loadSettings = async () => {
  const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
  if (settingsDoc.exists()) {
    const data = settingsDoc.data();
    SUBSCRIPTION_FEE = data.subscriptionFee || 300;
    IRRIGATION_RATE = data.irrigationRate || 45;
    WORKER_WAGE_PER_HOUR = data.workerWagePerHour || 12;
  }
};

export const saveSettings = async (subscriptionFee: number, irrigationRate: number, workerWagePerHour: number) => {
  await setDoc(doc(db, 'settings', 'config'), {
    subscriptionFee,
    irrigationRate,
    workerWagePerHour
  });
  SUBSCRIPTION_FEE = subscriptionFee;
  IRRIGATION_RATE = irrigationRate;
  WORKER_WAGE_PER_HOUR = workerWagePerHour;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
