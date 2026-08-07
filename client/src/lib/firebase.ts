import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyABOiD_C5q2vookdkOQ5GPUWUJrRI1YPQ8',
  authDomain: 'project-8c231437-c737-46f1-924.firebaseapp.com',
  projectId: 'project-8c231437-c737-46f1-924',
  storageBucket: 'project-8c231437-c737-46f1-924.firebasestorage.app',
  messagingSenderId: '217184132841',
  appId: '1:217184132841:web:f10d9e39bf5e3beabada78',
  measurementId: 'G-36S5M2Z6MG',
};

export const app = initializeApp(firebaseConfig);

export const initAnalytics = async () => {
  const supported = await isSupported();
  if (supported) {
    return getAnalytics(app);
  }
  return null;
};

export default app;