
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Part, LogEntry, ApiResponse, User, SystemSettings } from '../types';
import { StorageService } from '../services/storageService';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

interface ConsumptionStat {
    operatorId: string;
    totalTaken: number;
    dailyData: { date: string; count: number }[];
}

interface InventoryContextType {
  parts: Part[];
  logs: LogEntry[];
  users: User[];
  isLoading: boolean;
  settings: SystemSettings;
  takePart: (partId: string, operatorId: string) => Promise<ApiResponse<Part>>;
  addPart: (formData: FormData) => Promise<ApiResponse<Part>>;
  editPart: (partId: string, formData: FormData) => Promise<ApiResponse<Part>>;
  removePart: (partId: string) => Promise<ApiResponse<null>>;
  restockPart: (partId: string, quantity: number) => Promise<ApiResponse<Part>>;
  resetAllStock: (quantity: number) => Promise<void>;
  searchParts: (query: string) => Part[];
  getPartsByLocation: (locationStr: string) => Part[];
  getLowStockParts: () => Part[];
  exportLogsToExcel: () => Promise<void>;
  exportStockToExcel: () => Promise<void>;
  formatLocation: (loc: Part['location'] | undefined) => string;
  refreshData: () => Promise<void>;
  addUser: (name: string) => Promise<ApiResponse<User>>;
  removeUser: (id: string) => Promise<ApiResponse<null>>;
  getConsumptionStats: () => ConsumptionStat[];
  resetConsumptionStats: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ phoneNumber: '' });
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, l, u, s] = await Promise.all([
          StorageService.getParts(), 
          StorageService.getLogs(),
          StorageService.getUsers(),
          StorageService.getSettings()
      ]);
      const validParts = (p || []).filter(item => item && item.id);
      setParts(validParts);
      setLogs(l || []);
      setUsers(u || []);
      setSettings(s);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    
    // Setup Real-time Listener for Supabase
    const sb = StorageService.getSubscribeClient();
    let subscription: any = null;

    if (sb) {
        console.log("Subscribing to Realtime changes...");
        const channel = sb.channel('custom-all-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'parts' },
            (payload) => {
                refreshData();
            }
        )
        .subscribe();
        subscription = channel;
    }

    return () => {
        if (subscription && sb) sb.removeChannel(subscription);
    };
  }, [refreshData]);

  const takePart = async (partId: string, operatorId: string) => {
    const res = await StorageService.takePart(partId, operatorId);
    if (res.success) await refreshData();
    return res;
  };

  const parseFormData = async (formData: FormData): Promise<Partial<Part>> => {
    const part: any = {};
    if (formData.has('name')) part.name = formData.get('name') as string;
    if (formData.has('quantity')) part.quantity = parseInt(formData.get('quantity') as string);
    if (formData.has('id')) part.id = formData.get('id') as string;
    
    if (formData.has('rack')) {
      part.location = {
        rack: formData.get('rack') as string,
        row: formData.get('row') as string,
        bin: formData.get('bin') as string,
      };
    }
    
    const imgFile = formData.get('image');
    if (imgFile instanceof File) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          part.image = reader.result as string;
          resolve(part);
        };
        reader.readAsDataURL(imgFile);
      });
    } else if (imgFile === '') {
        part.image = undefined; 
    }

    return part;
  };

  const addPart = async (formData: FormData) => {
    try {
        const partData = await parseFormData(formData);
        if (!partData.id || !partData.location) {
            return { success: false, message: 'Part ID and Location are required.' };
        }
        const newPart: Part = {
            id: partData.id,
            name: partData.name || 'Unnamed Part',
            quantity: partData.quantity || 0,
            location: partData.location,
            image: partData.image
        };
        const res = await StorageService.addPart(newPart);
        if (res.success) await refreshData();
        return res;
    } catch (e: any) {
        return { success: false, message: e.message || 'Failed to add part' };
    }
  };

  const editPart = async (partId: string, formData: FormData) => {
    const partData = await parseFormData(formData);
    const res = await StorageService.updatePart(partId, partData);
    if (res.success) await refreshData();
    return res;
  };

  const removePart = async (partId: string) => {
    const res = await StorageService.removePart(partId);
    if (res.success) await refreshData();
    return res;
  };

  const restockPart = async (partId: string, quantity: number) => {
    const res = await StorageService.restockPart(partId, quantity, 'Supervisor');
    if (res.success) await refreshData();
    return res;
  };

  const resetAllStock = async (quantity: number) => {
    await StorageService.resetAllStock(quantity, 'Supervisor');
    await refreshData();
  };
  
  const addUser = async (name: string) => {
      const id = `MOLEX_OPR_${Date.now().toString().slice(-6)}`;
      const newUser: User = { id, name, isSupervisor: false };
      const res = await StorageService.addUser(newUser);
      if (res.success) await refreshData();
      return res;
  };

  const removeUser = async (id: string) => {
      const res = await StorageService.removeUser(id);
      if (res.success) await refreshData();
      return res;
  };

  // --- ANALYTICS LOGIC ---
  const resetConsumptionStats = async () => {
      const newSettings = { ...settings, statsStartDate: new Date().toISOString() };
      await StorageService.saveSettings(newSettings);
      await refreshData();
  };

  const getConsumptionStats = (): ConsumptionStat[] => {
      // 1. Filter logs based on Start Date
      const startDate = settings.statsStartDate ? new Date(settings.statsStartDate) : new Date(0);
      
      const relevantLogs = logs.filter(l => 
          l.action === 'TAKE' && 
          new Date(l.timestamp) > startDate
      );

      // 2. Group by Operator
      const statsMap: Record<string, { total: number, days: Record<string, number> }> = {};

      relevantLogs.forEach(log => {
          const op = log.operatorId;
          const date = new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const qty = Math.abs(log.quantityChange); // quantityChange is negative for TAKE

          if (!statsMap[op]) statsMap[op] = { total: 0, days: {} };
          
          statsMap[op].total += qty;
          statsMap[op].days[date] = (statsMap[op].days[date] || 0) + qty;
      });

      // 3. Convert to Array
      return Object.entries(statsMap).map(([operatorId, data]) => ({
          operatorId,
          totalTaken: data.total,
          dailyData: Object.entries(data.days).map(([date, count]) => ({ date, count }))
      })).sort((a,b) => b.totalTaken - a.totalTaken); // Highest consumer first
  };

  const formatLocation = useCallback((location: Part['location'] | undefined) => {
    if (!location) return 'N/A';
    return `${location.rack || '?'}-${location.row || '?'}-${location.bin || '?'}`;
  }, []);

  const searchParts = useCallback((query: string) => {
    if (!query) return parts;
    const upperQuery = query.toUpperCase();
    return parts.filter(p => {
        const id = p.id || '';
        const name = p.name || '';
        const locString = formatLocation(p.location).toUpperCase();
        return id.toUpperCase().includes(upperQuery) || 
               name.toUpperCase().includes(upperQuery) ||
               locString.includes(upperQuery);
    });
  }, [parts, formatLocation]);

  const getPartsByLocation = (locationStr: string) => {
    return parts.filter(p => formatLocation(p.location) === locationStr);
  };
  
  const getLowStockParts = () => {
    return parts.filter(p => p.quantity <= 5);
  };

  const exportLogsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activity Logs');
    worksheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 25 },
        { header: 'Operator', key: 'operatorId', width: 20 },
        { header: 'Action', key: 'action', width: 20 },
        { header: 'Part Name', key: 'partName', width: 30 },
        { header: 'Part ID', key: 'partId', width: 20 },
        { header: 'Qty Change', key: 'quantityChange', width: 15 },
        { header: 'Remaining', key: 'remaining', width: 15 },
    ];
    logs.forEach(log => {
        worksheet.addRow({ ...log, timestamp: new Date(log.timestamp).toLocaleString() });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportStockToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Current Stock');
    worksheet.columns = [
        { header: 'Part ID', key: 'id', width: 20 },
        { header: 'Part Name', key: 'name', width: 40 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 15 },
    ];
    parts.forEach(part => {
        worksheet.addRow({ ...part, location: formatLocation(part.location) });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `stock_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const value = { parts, logs, users, isLoading, settings, takePart, addPart, editPart, removePart, restockPart, searchParts, getLowStockParts, exportLogsToExcel, resetAllStock, formatLocation, getPartsByLocation, exportStockToExcel, refreshData, addUser, removeUser, getConsumptionStats, resetConsumptionStats };
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
