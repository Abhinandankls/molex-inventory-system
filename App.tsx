
import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { BrandingProvider } from './context/BrandingContext';
import { LoginScreen } from './components/LoginScreen';
import { OperatorView } from './components/OperatorView';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { Modal } from './components/common/Modal';
import { useUsbScanner } from './hooks/useUsbScanner';
import { User, Part } from './types';
import { SUPERVISOR_QR_ID, SUPERVISOR_NAME, LOCATION_QR_PREFIX, ADMIN_PIN } from './constants';
import { CameraIcon, LockClosedIcon } from './components/Icons';

const AppContent = () => {
  const { getPartsByLocation, users } = useInventory();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isPinSubmitLocked, setIsPinSubmitLocked] = useState(false);
  const [locationModalData, setLocationModalData] = useState<{ isOpen: boolean; location: string; parts: Part[] }>({ 
      isOpen: false, location: '', parts: [] 
  });

  const openLocationModal = (locationStr: string) => {
      const partsInLocation = getPartsByLocation(locationStr);
      setLocationModalData({ isOpen: true, location: locationStr, parts: partsInLocation });
  };

  const handleScanAttempt = (scannedId: string) => {
    setLastError(null);
    if (scannedId.startsWith(LOCATION_QR_PREFIX)) {
        openLocationModal(scannedId.replace(LOCATION_QR_PREFIX, ''));
        return;
    }
    if (scannedId === SUPERVISOR_QR_ID) {
      setIsAdminAuthOpen(true);
      setPinInput('');
      setIsPinSubmitLocked(true);
      setTimeout(() => setIsPinSubmitLocked(false), 1000); 
      return;
    }
    const foundUser = users.find(u => u.id === scannedId);
    if (foundUser) {
        setCurrentUser(foundUser);
        return;
    }
    setLastError(`Access Denied: Unknown ID (${scannedId})`);
    setTimeout(() => setLastError(null), 3000);
  };

  const handleAdminPinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isPinSubmitLocked) return;
      if (!pinInput || pinInput.trim() === '') return;
      if (pinInput === ADMIN_PIN) {
          setCurrentUser({ id: SUPERVISOR_QR_ID, name: SUPERVISOR_NAME, isSupervisor: true });
          setIsAdminAuthOpen(false);
      } else {
          alert("Incorrect PIN.");
          setPinInput('');
      }
  };
  
  const handleLogout = () => setCurrentUser(null);
  
  useUsbScanner((scannedCode) => {
      if (!currentUser && !isAdminAuthOpen) handleScanAttempt(scannedCode);
  }, !currentUser && !isAdminAuthOpen);

  return (
    <>
      {!currentUser ? (
        <LoginScreen 
            error={lastError} 
            onSupervisorClick={() => handleScanAttempt(SUPERVISOR_QR_ID)} 
        />
      ) : currentUser.isSupervisor ? (
        <SupervisorDashboard currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <OperatorView 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onSwitchToSupervisor={() => handleScanAttempt(SUPERVISOR_QR_ID)}
            onLocationScan={openLocationModal}
        />
      )}

      <Modal isOpen={isAdminAuthOpen} onClose={() => setIsAdminAuthOpen(false)} title="Security Verification">
          <form onSubmit={handleAdminPinSubmit} className="flex flex-col items-center p-4">
              <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <LockClosedIcon className="w-8 h-8" />
              </div>
              <p className="text-gray-300 mb-6 text-center">
                  {isPinSubmitLocked ? "Initializing..." : "Enter Admin PIN."}
              </p>
              <input type="password" autoFocus autoComplete="off" className="bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-center text-2xl font-bold text-white mb-6 w-48 outline-none" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="••••" disabled={isPinSubmitLocked}/>
              <button type="submit" disabled={isPinSubmitLocked} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl">Verify Access</button>
          </form>
      </Modal>

      <Modal isOpen={locationModalData.isOpen} onClose={() => setLocationModalData({ isOpen: false, location: '', parts: [] })} title={`Bin Contents: ${locationModalData.location}`}>
          {locationModalData.parts.length > 0 ? (
              <div className="space-y-3">
                  {locationModalData.parts.map(part => (
                      <div key={part.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center shrink-0"><img src={part.image || "https://picsum.photos/100"} className="max-w-full max-h-full object-contain" alt="part"/></div>
                          <div className="flex-1"><h3 className="font-bold text-white">{part.name}</h3><p className="text-sm text-primary-400">{part.id}</p></div>
                          <div className="text-right"><div className="text-xs text-gray-400">Qty</div><div className="text-xl font-bold text-white">{part.quantity}</div></div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-12 text-gray-500"><CameraIcon className="w-12 h-12 mx-auto mb-3 opacity-50"/><p>This location is currently empty.</p></div>
          )}
      </Modal>
    </>
  );
};

export const App = () => {
  return (
    <BrandingProvider>
      <InventoryProvider>
        <AppContent />
      </InventoryProvider>
    </BrandingProvider>
  );
};

export default App;
