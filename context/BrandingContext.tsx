import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { MolexLogo } from '../components/Icons';

interface BrandingContextType {
  setLogo: (file: File) => Promise<void>;
  clearLogo: () => Promise<void>;
  CompanyLogo: React.FC<{ className?: string }>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    StorageService.getLogo().then(setLogoUrl);
  }, []);

  const setLogo = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      StorageService.setLogo(base64);
      setLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = async () => {
    await StorageService.removeLogo();
    setLogoUrl(null);
  };

  const CompanyLogo = ({ className }: { className?: string }) => {
    if (logoUrl) {
      return <img src={logoUrl} alt="Company Logo" className={`object-contain ${className}`} style={{ maxHeight: '60px' }} />;
    }
    return <MolexLogo className={className} />;
  };

  return (
    <BrandingContext.Provider value={{ setLogo, clearLogo, CompanyLogo }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within a BrandingProvider');
  return context;
};