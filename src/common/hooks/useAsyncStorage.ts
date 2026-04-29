import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null) setStoredValue(JSON.parse(item) as T);
      } finally {
        setLoading(false);
      }
    })();
  }, [key]);

  const setValue = useCallback(async (value: T) => {
    setStoredValue(value);
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }, [key]);

  const removeValue = useCallback(async () => {
    setStoredValue(initialValue);
    await AsyncStorage.removeItem(key);
  }, [key, initialValue]);

  return { storedValue, setValue, removeValue, loading };
}
