
export interface Part {
  id: string;
  name: string;
  quantity: number;
  image?: string;
  location: {
    rack: string;
    row: string;
    bin: string;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  operatorId: string;
  action: 'TAKE' | 'RESTOCK' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET';
  partId?: string;
  partName?: string;
  quantityChange: number;
  remaining?: number;
}

export interface User {
  id: string;
  name: string;
  isSupervisor: boolean;
}

export interface BrandingConfig {
  logoUrl: string | null;
}

export interface SupabaseConfig {
    url: string;
    key: string;
    enabled: boolean;
}

export interface SystemSettings {
    phoneNumber: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseEnabled?: boolean;
    statsStartDate?: string; // New: Timestamp for when the "Count" was last cleared
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
