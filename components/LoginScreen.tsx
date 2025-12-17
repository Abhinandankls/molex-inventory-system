
import React from 'react';
import { useBranding } from '../context/BrandingContext';
import { QrCodeIcon, ExclamationTriangleIcon, UserCircleIcon } from './Icons';

interface LoginScreenProps {
  error: string | null;
  onSupervisorClick?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ error, onSupervisorClick }) => {
  const { CompanyLogo } = useBranding();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-dark-bg to-primary-950 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 bg-dark-surface/50 backdrop-blur-md p-12 rounded-3xl border border-white/5 shadow-2xl max-w-lg w-full transform transition-all hover:scale-[1.01]">
            <div className="flex justify-center mb-8">
                <CompanyLogo className="h-16" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Inventory Access</h1>
            <p className="text-gray-400 mb-10">Authorized Personnel Only</p>
            
            <div className="relative group cursor-pointer mb-6">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-dark-bg rounded-2xl p-8 flex flex-col items-center border border-dark-border">
                    <div className="animate-pulse">
                        <QrCodeIcon className="w-24 h-24 text-primary-500 mb-4" />
                    </div>
                    <p className="text-lg text-gray-200 font-medium">Scan Employee Badge</p>
                    <p className="text-sm text-gray-500 mt-2">or scan a Location QR to view contents</p>
                </div>
            </div>

            <button 
                onClick={onSupervisorClick}
                className="w-full flex items-center justify-center gap-2 mx-auto transition-all px-6 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg shadow-red-900/50 mb-4 border border-red-400 animate-pulse"
            >
                <UserCircleIcon className="w-6 h-6"/> ADMIN LOGIN
            </button>

            {error && (
                <div className="mt-8 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <ExclamationTriangleIcon className="w-5 h-5"/>
                    <span className="font-medium">{error}</span>
                </div>
            )}
        </div>
        
        <div className="mt-8 text-gray-500 text-xs font-mono opacity-60">
            Molex Inventory System • Enterprise Edition
        </div>
    </div>
  );
};
