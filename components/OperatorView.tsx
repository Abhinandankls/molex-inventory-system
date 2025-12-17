
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useBranding } from '../context/BrandingContext';
import { useUsbScanner } from '../hooks/useUsbScanner';
import { Part, User } from '../types';
import { LOCATION_QR_PREFIX, SUPERVISOR_QR_ID, LOGOUT_QR_ID } from '../constants';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, CameraIcon, DocumentTextIcon, LogoutIcon, ChartBarIcon } from './Icons';
import { Modal } from './common/Modal';
import { AnalyticsChart } from './common/AnalyticsChart';

interface Props {
  currentUser: User;
  onLogout: () => void;
  onSwitchToSupervisor: () => void;
  onLocationScan: (loc: string) => void;
}

export const OperatorView: React.FC<Props> = ({ currentUser, onLogout, onSwitchToSupervisor, onLocationScan }) => {
  const { takePart, logs, getConsumptionStats } = useInventory();
  const { CompanyLogo } = useBranding();
  const [lastMessage, setLastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' }>({ 
    text: 'System Ready. Scan Item QR.', type: 'info' 
  });
  const [lastScannedPart, setLastScannedPart] = useState<Part | null>(null);
  const [showStats, setShowStats] = useState(false);

  const recentLogs = useMemo(() => {
    return logs.filter(log => log.operatorId === currentUser.name).slice(0, 5);
  }, [logs, currentUser.name]);

  const myStats = useMemo(() => {
      if (!showStats) return { totalTaken: 0, dailyData: [] };
      
      const allStats = getConsumptionStats();
      const myData = allStats.find(s => s.operatorId === currentUser.name);
      
      const days = [];
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          
          const existing = myData?.dailyData.find(x => x.date === dateStr);
          days.push({
              label: dateStr,
              value: existing ? existing.count : 0
          });
      }

      return { 
          totalTaken: myData?.totalTaken || 0,
          dailyData: days
      };
  }, [showStats, getConsumptionStats, currentUser.name]);

  const handleScan = async (scannedCode: string) => {
    if (scannedCode.startsWith(LOCATION_QR_PREFIX)) {
      onLocationScan(scannedCode.replace(LOCATION_QR_PREFIX, ''));
      return;
    }
    if (scannedCode === LOGOUT_QR_ID) {
      onLogout();
      return;
    }
    if (scannedCode === SUPERVISOR_QR_ID) {
      onSwitchToSupervisor();
      return;
    }

    const { success, message, data } = await takePart(scannedCode, currentUser.name);
    setLastMessage({ text: message, type: success ? 'success' : 'error' });
    setLastScannedPart(data || null);
  };

  useUsbScanner(handleScan, true);

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white">
      <header className="bg-dark-surface border-b border-dark-border p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <CompanyLogo className="h-10" />
            <div className="hidden md:block h-8 w-px bg-gray-600"></div>
            <div className="text-xl font-bold text-primary-400">
              Operator Station <span className="text-gray-400 font-normal text-base ml-2">| {currentUser.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowStats(true)} className="flex items-center gap-2 bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 border border-blue-800 px-4 py-2 rounded-lg transition-all">
                <ChartBarIcon className="w-5 h-5" /> <span className="hidden sm:inline">My Stats</span>
             </button>
             <button onClick={onLogout} className="flex items-center gap-2 bg-red-600/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all shadow-md">
                <LogoutIcon /> <span className="hidden sm:inline">Logout</span>
             </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col justify-center items-center bg-dark-surface rounded-2xl p-8 border border-dark-border shadow-inner relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/10 to-transparent pointer-events-none"></div>
          <h2 className="text-3xl font-bold text-gray-200 mb-2 z-10">Scan Action Status</h2>
          <p className="text-gray-400 mb-8 z-10 text-center max-w-md">Use your handheld scanner to deduct stock or check locations.</p>
          <div className={`w-full max-w-lg p-6 rounded-xl flex items-center gap-4 transition-all duration-300 transform scale-100 border z-10
            ${lastMessage.type === 'success' ? 'bg-green-900/30 border-green-700/50 text-green-200' : 
              lastMessage.type === 'error' ? 'bg-red-900/30 border-red-700/50 text-red-200' : 
              'bg-blue-900/30 border-blue-700/50 text-blue-200'}`}>
            <div className={`p-3 rounded-full shrink-0 ${
               lastMessage.type === 'success' ? 'bg-green-900/50' : 
               lastMessage.type === 'error' ? 'bg-red-900/50' : 'bg-blue-900/50'
            }`}>
              {lastMessage.type === 'success' && <CheckCircleIcon className="w-8 h-8" />}
              {lastMessage.type === 'error' && <ExclamationTriangleIcon className="w-8 h-8" />}
              {lastMessage.type === 'info' && <InformationCircleIcon className="w-8 h-8" />}
            </div>
            <div className="text-lg font-medium">{lastMessage.text}</div>
          </div>
        </div>

        <div className="flex flex-col bg-dark-surface rounded-2xl border border-dark-border shadow-lg overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gray-800/50">
            <h3 className="text-lg font-semibold text-gray-300">Last Scanned Item</h3>
          </div>
          <div className="flex-grow flex flex-col items-center justify-center p-8 bg-black/20">
            {lastScannedPart ? (
               <div className="animate-in fade-in zoom-in duration-300 text-center">
                 <div className="relative w-64 h-64 bg-white rounded-lg p-4 flex items-center justify-center mb-6 shadow-2xl mx-auto">
                   <img src={lastScannedPart.image || "https://picsum.photos/200"} alt={lastScannedPart.name} className="max-w-full max-h-full object-contain" />
                   <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                      QTY: {lastScannedPart.quantity}
                   </div>
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-1">{lastScannedPart.name}</h2>
                 <p className="text-primary-400 font-mono text-lg">{lastScannedPart.id}</p>
                 <p className="text-gray-500 mt-2 text-sm">{lastScannedPart.location.rack}-{lastScannedPart.location.row}-{lastScannedPart.location.bin}</p>
               </div>
            ) : (
              <div className="text-center text-gray-600">
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-700">
                  <CameraIcon className="w-12 h-12" />
                </div>
                <p className="text-lg">Waiting for scan...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-dark-surface border-t border-dark-border mt-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4" /> Session History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="bg-dark-bg border border-dark-border p-3 rounded flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 overflow-hidden">
                     <span className="text-gray-500 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     <span className="text-gray-300 truncate font-medium" title={log.partName}>{log.partName || log.partId}</span>
                   </div>
                   <div className="flex items-center gap-2 shrink-0">
                      <span className="text-red-400 font-bold bg-red-900/20 px-2 py-0.5 rounded text-xs">{log.quantityChange}</span>
                      <span className="text-gray-600 text-xs">Rem: {log.remaining}</span>
                   </div>
                </div>
             )) : (
               <div className="text-gray-600 italic text-sm col-span-full">No activity in this session yet.</div>
             )}
          </div>
        </div>
      </footer>

      <Modal isOpen={showStats} onClose={() => setShowStats(false)} title={`Statistics: ${currentUser.name}`}>
          <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-900/20 p-6 rounded-xl border border-blue-800/50">
                  <div>
                      <p className="text-blue-200 text-sm font-medium">Total Consumed (This Month)</p>
                      <p className="text-gray-400 text-xs">(Based on current stats cycle)</p>
                  </div>
                  <div className="text-4xl font-bold text-white">{myStats.totalTaken}</div>
              </div>
              <div className="bg-dark-bg p-4 rounded-xl border border-dark-border">
                  <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4"/> Daily Mating Part Consume Graph (Last 7 Days)
                  </h4>
                  <div className="h-64">
                    <AnalyticsChart 
                        data={myStats.dailyData} 
                        color="#3b82f6"
                    />
                  </div>
              </div>
              <div className="text-center text-xs text-gray-500">
                  * Counts are reset periodically by the supervisor.
              </div>
          </div>
      </Modal>
    </div>
  );
};
