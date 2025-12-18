import { Part, LogEntry, ApiResponse, SupabaseConfig, SystemSettings, User } from '../types';
import { INITIAL_PARTS_SEED } from '../constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CLOUD CONFIGURATION ---
// Safely access Vite environment variables
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';
const API_KEY = (import.meta as any).env?.VITE_APP_API_KEY || 'MOLEX_SECURE_ACCESS_2025';

// Helper: Get from Local Storage (Fallback only)
const getLocal = <T>(key: string, defaultVal: T): T => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : defaultVal;
    } catch (e) {
        return defaultVal;
    }
};

const setLocal = (key: string, val: any) => {
    localStorage.setItem(key, JSON.stringify(val));
};

// Singleton Supabase Client
let supabase: SupabaseClient | null = null;

// Helper for Secure Fetch
const secureFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
        'x-api-key': API_KEY,
        ...options.headers,
    };
    
    // Ensure URL starts with /api if it's a relative path
    const targetPath = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${targetPath.replace('/api', '')}`;
    
    return fetch(fullUrl, { ...options, headers });
};

export const StorageService = {
  // Initialize connection by fetching settings from server
  initConnection: async (): Promise<boolean> => {
      try {
          const settings = await StorageService.getSettings();
          if (settings.supabaseEnabled && settings.supabaseUrl && settings.supabaseKey) {
              if (!supabase) {
                  supabase = createClient(settings.supabaseUrl, settings.supabaseKey);
                  console.log("✅ Connected to Global Cloud Database");
              }
              return true;
          }
          supabase = null;
          return false;
      } catch (e) {
          console.error("Failed to init connection", e);
          return false;
      }
  },

  getCloudConfig: async (): Promise<SupabaseConfig> => {
      const settings = await StorageService.getSettings();
      return {
          url: settings.supabaseUrl || '',
          key: settings.supabaseKey || '',
          enabled: settings.supabaseEnabled || false
      };
  },

  setCloudConfig: async (config: SupabaseConfig) => {
      const current = await StorageService.getSettings();
      await StorageService.saveSettings({
          ...current,
          supabaseUrl: config.url,
          supabaseKey: config.key,
          supabaseEnabled: config.enabled
      });
      
      supabase = null; 
      if (config.enabled && config.url && config.key) {
          supabase = createClient(config.url, config.key);
      }
  },

  getSettings: async (): Promise<SystemSettings> => {
      try {
          const res = await secureFetch(`/settings`);
          if (!res.ok) throw new Error("Failed to fetch settings");
          return await res.json();
      } catch (e) {
          return { phoneNumber: '' };
      }
  },

  saveSettings: async (settings: SystemSettings): Promise<ApiResponse<null>> => {
      try {
          const res = await secureFetch(`/settings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings)
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Failed to save settings' };
      }
  },

  triggerLowStockAlert: async (items: Part[]): Promise<ApiResponse<null>> => {
      try {
          const res = await secureFetch(`/notifications/low-stock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items })
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Failed to trigger alert' };
      }
  },

  autoDetectTelegramId: async (token: string): Promise<ApiResponse<any> & { chatId?: string, user?: string }> => {
      try {
          const res = await secureFetch(`/telegram/auto-detect`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Failed to connect to server.' };
      }
  },
  
  testTelegram: async (): Promise<ApiResponse<any>> => {
      try {
          const res = await secureFetch(`/telegram/test`, { method: 'POST' });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Failed to test telegram.' };
      }
  },

  getUsers: async (): Promise<User[]> => {
      try {
          const res = await secureFetch(`/users`);
          if (!res.ok) throw new Error('API Error');
          return await res.json();
      } catch (e) {
          return [];
      }
  },

  addUser: async (user: User): Promise<ApiResponse<User>> => {
      try {
          const res = await secureFetch(`/users`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user)
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Network Error' };
      }
  },

  removeUser: async (id: string): Promise<ApiResponse<null>> => {
      try {
          const res = await secureFetch(`/users/${id}`, { method: 'DELETE' });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Network Error' };
      }
  },

  getParts: async (): Promise<Part[]> => {
    if (!supabase) await StorageService.initConnection();
    if (supabase) {
        const { data, error } = await supabase.from('parts').select('*');
        if (!error && data) return data;
    }
    try {
      const res = await secureFetch(`/parts`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (data.length === 0) return getLocal('parts', INITIAL_PARTS_SEED);
      return data;
    } catch (e) {
      return getLocal('parts', INITIAL_PARTS_SEED);
    }
  },

  getLogs: async (): Promise<LogEntry[]> => {
    if (!supabase) await StorageService.initConnection();
    if (supabase) {
        const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (!error && data) return data;
    }
    try {
      const res = await secureFetch(`/logs`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return getLocal('logs', []);
    }
  },

  getLogo: async (): Promise<string | null> => {
    try {
      const res = await secureFetch(`/branding`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return data;
    } catch (e) {
      return getLocal('logo', null);
    }
  },

  setLogo: async (base64Image: string): Promise<void> => {
    try {
      await secureFetch(`/branding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: base64Image })
      });
    } catch (e) {
      setLocal('logo', base64Image);
    }
  },

  removeLogo: async (): Promise<void> => {
    try {
      await secureFetch(`/branding`, { method: 'DELETE' });
    } catch (e) {
      localStorage.removeItem('logo');
    }
  },

  addPart: async (newPart: Part): Promise<ApiResponse<Part>> => {
    if (supabase) {
        const { data, error } = await supabase.from('parts').insert(newPart).select().single();
        if (error) return { success: false, message: error.message };
        await StorageService.logActivity('Supervisor', 'CREATE', newPart.id, newPart.name, newPart.quantity);
        return { success: true, message: 'Saved to Global DB', data: data };
    }
    try {
      const res = await secureFetch(`/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPart)
      });
      const data = await res.json();
      if (data.success) await StorageService.logActivity('Supervisor', 'CREATE', newPart.id, newPart.name, newPart.quantity);
      return data;
    } catch (e) {
        return { success: false, message: 'Network Error' };
    }
  },

  updatePart: async (id: string, updates: Partial<Part>): Promise<ApiResponse<Part>> => {
    if (supabase) {
        const { data, error } = await supabase.from('parts').update(updates).eq('id', id).select().single();
        if (error) return { success: false, message: error.message };
        await StorageService.logActivity('Supervisor', 'UPDATE', id, data.name, 0);
        return { success: true, message: 'Updated Global DB', data: data };
    }
    try {
      const res = await secureFetch(`/parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) await StorageService.logActivity('Supervisor', 'UPDATE', id, data.data.name, 0);
      return data;
    } catch (e) {
        return { success: false, message: 'Network Error' };
    }
  },

  removePart: async (id: string): Promise<ApiResponse<null>> => {
    if (supabase) {
        const { data: part } = await supabase.from('parts').select('*').eq('id', id).single();
        const { error } = await supabase.from('parts').delete().eq('id', id);
        if (error) return { success: false, message: error.message };
        if (part) await StorageService.logActivity('Supervisor', 'DELETE', id, part.name, -part.quantity);
        return { success: true, message: 'Deleted from Global DB' };
    }
    try {
      const parts = await StorageService.getParts(); 
      const part = parts.find(p => p.id === id);
      const res = await secureFetch(`/parts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && part) await StorageService.logActivity('Supervisor', 'DELETE', id, part.name, -part.quantity);
      return data;
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  takePart: async (id: string, operatorId: string): Promise<ApiResponse<Part>> => {
    if (supabase) {
        const { data: current, error: fetchError } = await supabase.from('parts').select('quantity, name').eq('id', id).single();
        if (fetchError || !current) return { success: false, message: 'Part not found' };
        if (current.quantity <= 0) return { success: false, message: 'Out of stock', data: current as Part };
        const newQty = current.quantity - 1;
        const { data: updated, error: updateError } = await supabase.from('parts').update({ quantity: newQty }).eq('id', id).select().single();
        if (updateError) return { success: false, message: updateError.message };
        await StorageService.logActivity(operatorId, 'TAKE', id, current.name, -1, newQty);
        return { success: true, message: 'Took 1 Item', data: updated };
    }
    try {
      const res = await secureFetch(`/parts/${id}/take`, { method: 'POST' });
      const data = await res.json();
      if (data.success) await StorageService.logActivity(operatorId, 'TAKE', id, data.data.name, -1, data.data.quantity);
      return data;
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  restockPart: async (id: string, quantity: number, operatorId: string): Promise<ApiResponse<Part>> => {
    if (supabase) {
        const { data: current } = await supabase.from('parts').select('quantity, name').eq('id', id).single();
        if (!current) return { success: false, message: 'Part not found' };
        const newQty = current.quantity + quantity;
        const { data: updated, error = null } = await supabase.from('parts').update({ quantity: newQty }).eq('id', id).select().single();
        if (error) return { success: false, message: error.message };
        await StorageService.logActivity(operatorId, 'RESTOCK', id, current.name, quantity, newQty);
        return { success: true, message: 'Stock Updated', data: updated };
    }
    try {
      const res = await secureFetch(`/parts/${id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (data.success) await StorageService.logActivity(operatorId, 'RESTOCK', id, data.data.name, quantity, data.data.quantity);
      return data;
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  resetAllStock: async (quantity: number, operatorId: string): Promise<ApiResponse<null>> => {
    if (supabase) {
        const { error } = await supabase.from('parts').update({ quantity: quantity }).neq('id', 'PLACEHOLDER');
        if (error) return { success: false, message: error.message };
        await StorageService.logActivity(operatorId, 'RESET', 'ALL', 'All Inventory', 0, quantity);
        return { success: true, message: 'Cloud Stock Reset' };
    }
    try {
      const res = await secureFetch(`/stock/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (data.success) await StorageService.logActivity(operatorId, 'RESET', 'ALL', 'All Inventory', 0, quantity);
      return data;
    } catch (e) {
       return { success: false, message: 'Network Error' };
    }
  },

  logActivity: async (operatorId: string, action: any, partId: string, partName: string, change: number, remaining?: number) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      operatorId,
      action,
      partId,
      partName,
      quantityChange: change,
      remaining
    };
    if (supabase) {
        await supabase.from('logs').insert(newLog);
        return;
    }
    try {
        await secureFetch(`/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLog)
        });
    } catch(e) { }
  },

  getSubscribeClient: () => supabase
};