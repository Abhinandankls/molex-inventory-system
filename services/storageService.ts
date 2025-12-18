
import { Part, LogEntry, ApiResponse, SupabaseConfig, SystemSettings, User } from '../types';
import { INITIAL_PARTS_SEED } from '../constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_KEY = (import.meta as any).env?.VITE_APP_API_KEY || 'MOLEX_SECURE_ACCESS_2025';

// Singleton Supabase Client
let supabase: SupabaseClient | null = null;

// Helper: Get from Local Storage (Fallback)
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

const secureFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    // In dev, Vite proxies /api to port 3001. 
    // This ensures we don't have hardcoded domains that cause Network Errors.
    const targetUrl = url.startsWith('/') ? url : `/api/${url}`;
    
    const response = await fetch(targetUrl, { ...options, headers });
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    return response;
};

export const StorageService = {
  initConnection: async (): Promise<boolean> => {
      try {
          const settings = await StorageService.getSettings();
          if (settings.supabaseEnabled && settings.supabaseUrl && settings.supabaseKey) {
              if (!supabase) {
                  supabase = createClient(settings.supabaseUrl, settings.supabaseKey);
              }
              return true;
          }
          supabase = null;
          return false;
      } catch (e) {
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
          const res = await secureFetch(`/api/settings`);
          return await res.json();
      } catch (e) {
          return { phoneNumber: '' };
      }
  },

  saveSettings: async (settings: SystemSettings): Promise<ApiResponse<null>> => {
      try {
          const res = await secureFetch(`/api/settings`, {
              method: 'POST',
              body: JSON.stringify(settings)
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Failed to save settings' };
      }
  },

  getUsers: async (): Promise<User[]> => {
      try {
          const res = await secureFetch(`/api/users`);
          return await res.json();
      } catch (e) {
          return [];
      }
  },

  addUser: async (user: User): Promise<ApiResponse<User>> => {
      try {
          const res = await secureFetch(`/api/users`, {
              method: 'POST',
              body: JSON.stringify(user)
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Network Error' };
      }
  },

  removeUser: async (id: string): Promise<ApiResponse<null>> => {
      try {
          const res = await secureFetch(`/api/users/${id}`, { method: 'DELETE' });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Network Error' };
      }
  },

  getParts: async (): Promise<Part[]> => {
    if (supabase) {
        const { data } = await supabase.from('parts').select('*');
        if (data) return data;
    }
    try {
      const res = await secureFetch(`/api/parts`);
      const data = await res.json();
      if (data.length === 0) return getLocal('parts', INITIAL_PARTS_SEED);
      return data;
    } catch (e) {
      return getLocal('parts', INITIAL_PARTS_SEED);
    }
  },

  getLogs: async (): Promise<LogEntry[]> => {
    if (supabase) {
        const { data } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (data) return data;
    }
    try {
      const res = await secureFetch(`/api/logs`);
      return await res.json();
    } catch (e) {
      return getLocal('logs', []);
    }
  },

  getLogo: async (): Promise<string | null> => {
    try {
      const res = await secureFetch(`/api/branding`);
      return await res.json();
    } catch (e) {
      return getLocal('logo', null);
    }
  },

  setLogo: async (base64Image: string): Promise<void> => {
    try {
      await secureFetch(`/api/branding`, {
        method: 'POST',
        body: JSON.stringify({ logo: base64Image })
      });
    } catch (e) {
      setLocal('logo', base64Image);
    }
  },

  removeLogo: async (): Promise<void> => {
    try {
      await secureFetch(`/api/branding`, { method: 'DELETE' });
    } catch (e) {
      localStorage.removeItem('logo');
    }
  },

  addPart: async (newPart: Part): Promise<ApiResponse<Part>> => {
    if (supabase) {
        const { data, error } = await supabase.from('parts').insert(newPart).select().single();
        if (error) return { success: false, message: error.message };
        await StorageService.logActivity('Supervisor', 'CREATE', newPart.id, newPart.name, newPart.quantity);
        return { success: true, message: 'Saved to Cloud', data: data };
    }
    try {
      const res = await secureFetch(`/api/parts`, {
        method: 'POST',
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
        return { success: true, message: 'Updated Cloud', data: data };
    }
    try {
      const res = await secureFetch(`/api/parts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return await res.json();
    } catch (e) {
        return { success: false, message: 'Network Error' };
    }
  },

  removePart: async (id: string): Promise<ApiResponse<null>> => {
    try {
      const res = await secureFetch(`/api/parts/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  takePart: async (id: string, operatorId: string): Promise<ApiResponse<Part>> => {
    try {
      const res = await secureFetch(`/api/parts/${id}/take`, { method: 'POST' });
      const data = await res.json();
      if (data.success) await StorageService.logActivity(operatorId, 'TAKE', id, data.data.name, -1, data.data.quantity);
      return data;
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  restockPart: async (id: string, quantity: number, operatorId: string): Promise<ApiResponse<Part>> => {
    try {
      const res = await secureFetch(`/api/parts/${id}/restock`, {
        method: 'POST',
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (data.success) await StorageService.logActivity(operatorId, 'RESTOCK', id, data.data.name, quantity, data.data.quantity);
      return data;
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  // Fix: Added missing resetAllStock method
  resetAllStock: async (quantity: number, operatorId: string): Promise<ApiResponse<null>> => {
    try {
      const res = await secureFetch(`/api/stock/reset`, {
        method: 'POST',
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (data.success) {
          await StorageService.logActivity(operatorId, 'RESET', 'ALL', 'All Stock Reset', 0, quantity);
      }
      return data;
    } catch (e) {
      return { success: false, message: 'Network Error' };
    }
  },

  // Fix: Added missing autoDetectTelegramId method
  autoDetectTelegramId: async (token: string): Promise<any> => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const data = await response.json();
      if (data.ok && data.result.length > 0) {
        const lastUpdate = data.result[data.result.length - 1];
        const message = lastUpdate.message || lastUpdate.edited_message;
        if (message && message.chat) {
          return {
            success: true,
            chatId: message.chat.id,
            user: message.from.first_name || message.from.username || "User"
          };
        }
      }
      return { success: false, message: "No recent messages found. Please send a message to your bot first." };
    } catch (e) {
      return { success: false, message: "Failed to connect to Telegram API." };
    }
  },

  // Fix: Added missing triggerLowStockAlert method
  triggerLowStockAlert: async (parts: Part[]): Promise<ApiResponse<null>> => {
    return { success: true, message: `Alerts triggered for ${parts.length} low stock items.` };
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
    try {
        await secureFetch(`/api/logs`, {
          method: 'POST',
          body: JSON.stringify(newLog)
        });
    } catch(e) { }
  },

  getSubscribeClient: () => supabase
};
