import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Default values if not set in Firestore
export let SUBSCRIPTION_FEE = 300;
export let IRRIGATION_RATE = 45;
export let WORKER_WAGE_PER_HOUR = 12;
export let ASSOCIATION_SIGNATURE_URL = '';

export const loadSettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      SUBSCRIPTION_FEE = data.subscriptionFee || 300;
      IRRIGATION_RATE = data.irrigationRate || 45;
      WORKER_WAGE_PER_HOUR = data.workerWagePerHour || 12;
      ASSOCIATION_SIGNATURE_URL = data.associationSignatureUrl || '';
    }
  } catch (err) {
    console.warn("Could not load settings:", err);
  }
};

export const saveSettings = async (
  subscriptionFee: number, 
  irrigationRate: number, 
  workerWagePerHour: number,
  associationSignatureUrl: string = ''
) => {
  await setDoc(doc(db, 'settings', 'config'), {
    subscriptionFee,
    irrigationRate,
    workerWagePerHour,
    associationSignatureUrl
  }, { merge: true });
  SUBSCRIPTION_FEE = subscriptionFee;
  IRRIGATION_RATE = irrigationRate;
  WORKER_WAGE_PER_HOUR = workerWagePerHour;
  ASSOCIATION_SIGNATURE_URL = associationSignatureUrl;
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

export const INCOME_CATEGORIES = [
  'تبرعات',
  'أخرى'
];
