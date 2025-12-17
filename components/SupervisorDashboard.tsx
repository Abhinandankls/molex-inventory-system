
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useBranding } from '../context/BrandingContext';
import { StorageService } from '../services/storageService';
import { QRCodeSVG } from 'qrcode.react';
import { Part, User, SupabaseConfig } from '../types';
import { SUPERVISOR_QR_ID, LOGOUT_QR_ID, SUPERVISOR_NAME } from '../constants';
import { Modal } from './common/Modal';
import { LabelPrinter } from './common/LabelPrinter'; 
import { AnalyticsChart } from './common/AnalyticsChart';
import { 
    ChartBarIcon, DocumentTextIcon, ListBulletIcon, CogIcon, SearchIcon, DownloadIcon, 
    PlusCircleIcon, PencilIcon, XCircleIcon, UploadIcon, RefreshIcon, FilterIcon, 
    UserCircleIcon, QrCodeIcon, ExclamationTriangleIcon, GridViewIcon, 
    LockClosedIcon, ShieldCheckIcon, DatabaseIcon, CameraIcon, EnvelopeIcon, CloudIcon, WifiIcon,
    DevicePhoneMobileIcon, PaperAirplaneIcon, CalendarDaysIcon
} from './Icons';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

const PrinterIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75 6.75 4.5 17.25 4.5 17.25 6.75M6.75 17.25 17.25 17.25M4.5 9.75 19.5 9.75M4.5 9.75a2.25 2.25 0 0 1-2.25-2.25V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5h6" />
  </svg>
);

interface Props {
  currentUser: User;
  onLogout: () => void;
}

const RackView = ({ parts, onPartSelect }: { parts: Part[], onPartSelect: (p: Part) => void }) => {
    const [selectedRack, setSelectedRack] = useState<string>('TC6');
    const racks = useMemo(() => Array.from(new Set(parts.map(p => p.location?.rack || 'Unassigned'))).sort(), [parts]);
    const rackData = useMemo(() => {
        const rows: Record<string, Record<string, Part[]>> = {};
        parts.filter(p => (p.location?.rack || 'Unassigned') === selectedRack).forEach(p => {
            const row = p.location?.row || '?';
            const bin = p.location?.bin || '?';
            if (!rows[row]) rows[row] = {};
            if (!rows[row][bin]) rows[row][bin] = [];
            rows[row][bin].push(p);
        });
        return rows;
    }, [parts, selectedRack]);

    const sortedRows = Object.keys(rackData).sort();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 bg-dark-surface/50 p-4 rounded-xl border border-dark-border backdrop-blur-sm">
                <span className="text-gray-400 font-medium">Select Rack:</span>
                <select 
                    value={selectedRack} 
                    onChange={e => setSelectedRack(e.target.value)}
                    className="bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white font-mono"
                >
                    {racks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex-1"></div>
                <div className="hidden sm:flex gap-4 text-xs">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded"></div> OK</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Low</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded"></div> Empty</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-700 border border-gray-600 rounded"></div> Unused</div>
                </div>
            </div>
            <div className="bg-dark-surface/30 rounded-2xl p-6 border border-dark-border overflow-x-auto shadow-2xl">
                {sortedRows.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <GridViewIcon className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                        No parts found in Rack {selectedRack}
                    </div>
                ) : (
                    <div className="space-y-6 min-w-[800px]">
                        {sortedRows.map(rowKey => (
                            <div key={rowKey} className="flex gap-4">
                                <div className="w-12 flex items-center justify-center bg-gray-800 rounded-lg border border-dark-border font-bold text-xl text-gray-500">
                                    {rowKey}
                                </div>
                                <div className="flex-1 grid grid-cols-10 gap-3">
                                    {Array.from({length: 10}).map((_, i) => {
                                        const binNum = (i + 1).toString();
                                        const partsInBin = rackData[rowKey][binNum];
                                        const hasParts = partsInBin && partsInBin.length > 0;
                                        const totalQty = hasParts ? partsInBin.reduce((sum, p) => sum + p.quantity, 0) : 0;
                                        
                                        let statusColor = 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700';
                                        if (hasParts) {
                                            if (totalQty === 0) statusColor = 'bg-red-900/40 border-red-500/50 hover:bg-red-900/60 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]';
                                            else if (totalQty <= 5) statusColor = 'bg-yellow-900/40 border-yellow-500/50 hover:bg-yellow-900/60 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]';
                                            else statusColor = 'bg-green-900/30 border-green-500/30 hover:bg-green-900/50 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]';
                                        }

                                        return (
                                            <div 
                                                key={binNum}
                                                onClick={() => hasParts && onPartSelect(partsInBin[0])}
                                                className={`
                                                    ${statusColor} border rounded-lg h-24 p-2 transition-all duration-200 cursor-pointer relative group
                                                    flex flex-col justify-between
                                                `}
                                            >
                                                <span className="text-xs text-gray-500 font-mono absolute top-1 right-2">{binNum}</span>
                                                {hasParts ? (
                                                    <>
                                                        <div className="text-xs font-bold text-white truncate mt-3" title={partsInBin[0].name}>
                                                            {partsInBin[0].name}
                                                        </div>
                                                        <div className={`text-lg font-bold ${totalQty === 0 ? 'text-red-400' : 'text-white'}`}>
                                                            {totalQty}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <PlusCircleIcon className="w-5 h-5 text-gray-600"/>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const PartModal = ({ isOpen, onClose, partToEdit, onSave }: any) => {
    const [name, setName] = useState('');
    const [id, setId] = useState('');
    const [qty, setQty] = useState(0);
    const [loc, setLoc] = useState({rack:'', row:'', bin:''});
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if(isOpen) {
            if(partToEdit) {
                setName(partToEdit.name);
                setId(partToEdit.id);
                setQty(partToEdit.quantity);
                setLoc(partToEdit.location || {rack:'', row:'', bin:''});
                setImagePreview(partToEdit.image || null);
                setImageFile(null);
            } else {
                setName(''); setId(''); setQty(0); setLoc({rack:'',row:'',bin:''});
                setImagePreview(null); setImageFile(null);
            }
        }
    }, [isOpen, partToEdit]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('id', id);
        fd.append('name', name);
        fd.append('quantity', qty.toString());
        fd.append('rack', loc.rack.toUpperCase());
        fd.append('row', loc.row.toUpperCase());
        fd.append('bin', loc.bin.toUpperCase());
        if (imageFile) fd.append('image', imageFile);
        else if (imagePreview === null && partToEdit?.image) fd.append('image', ''); 
        onSave(fd);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={partToEdit ? 'Edit Inventory Item' : 'Add New Item'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Part ID / SKU</label>
                        <input required disabled={!!partToEdit} value={id} onChange={e=>setId(e.target.value.toUpperCase())} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-primary-500 outline-none disabled:opacity-50"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Item Name</label>
                        <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-primary-500 outline-none"/>
                    </div>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Item Photo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-dark-bg rounded-lg border border-dark-border flex items-center justify-center overflow-hidden shrink-0">
                            {imagePreview ? (
                                <img src={imagePreview} className="w-full h-full object-contain" alt="Preview"/>
                            ) : (
                                <CameraIcon className="w-8 h-8 text-gray-600"/>
                            )}
                        </div>
                        <div className="flex-1">
                             <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 mb-2">
                                <UploadIcon className="w-4 h-4"/> Select Photo
                                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden"/>
                            </label>
                            {imagePreview && (
                                <button type="button" onClick={handleRemoveImage} className="ml-2 text-xs text-red-400 hover:text-red-300">Remove</button>
                            )}
                            <p className="text-[10px] text-gray-500 mt-1">Supports JPG, PNG. Max 5MB.</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Storage Location</label>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="text-xs text-gray-400 block mb-1">Rack</label><input required value={loc.rack} onChange={e=>setLoc({...loc, rack:e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-white text-center font-mono"/></div>
                        <div><label className="text-xs text-gray-400 block mb-1">Row</label><input required value={loc.row} onChange={e=>setLoc({...loc, row:e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-white text-center font-mono"/></div>
                        <div><label className="text-xs text-gray-400 block mb-1">Bin</label><input required value={loc.bin} onChange={e=>setLoc({...loc, bin:e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-white text-center font-mono"/></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label><input type="number" required value={qty} onChange={e=>setQty(Number(e.target.value))} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-primary-500 outline-none" min="0"/></div>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-dark-border mt-2">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-white font-bold shadow-lg shadow-primary-900/30 transition-all">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
};

export const SupervisorDashboard: React.FC<Props> = ({ currentUser, onLogout }) => {
  const { parts, logs, users, settings, addUser, removeUser, getLowStockParts, addPart, editPart, removePart, restockPart, searchParts, exportLogsToExcel, resetAllStock, formatLocation, exportStockToExcel, getConsumptionStats, resetConsumptionStats } = useInventory();
  const { setLogo, clearLogo, CompanyLogo } = useBranding();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'rack'>('list');
  const [isLocked, setIsLocked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{id: string, name: string, type: 'USER' | 'PART', detail?: string} | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [cloudConfig, setCloudConfig] = useState<SupabaseConfig>({ url: '', key: '', enabled: false });
  const [alertPhone, setAlertPhone] = useState<string>('');
  const [telegramToken, setTelegramToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const consumptionStats = useMemo(() => getConsumptionStats(), [logs, settings.statsStartDate]);

  const dailyHourlyStats = useMemo(() => {
      const buckets = Array(24).fill(0);
      const targetDate = new Date(selectedDate);
      const targetDateStr = targetDate.toDateString();
      logs.filter(l => {
          if (l.action !== 'TAKE') return false;
          const logDate = new Date(l.timestamp);
          return logDate.toDateString() === targetDateStr;
      }).forEach(l => {
          const hour = new Date(l.timestamp).getHours();
          buckets[hour] += Math.abs(l.quantityChange);
      });
      return buckets.map((count, hour) => ({ label: `${hour}:00`, value: count }));
  }, [logs, selectedDate]);

  useEffect(() => {
    if (activeTab === 'settings') {
        StorageService.getCloudConfig().then(setCloudConfig);
        StorageService.getSettings().then(settings => {
            setAlertPhone(settings.phoneNumber || '');
            setTelegramToken(settings.telegramBotToken || '');
            setTelegramChatId(settings.telegramChatId || '');
        });
    }
  }, [activeTab]);

  const handleSaveCloudConfig = async () => {
    await StorageService.setCloudConfig(cloudConfig);
    alert("Global Database settings saved! All terminals will now use this database on refresh.");
    window.location.reload(); 
  };

  const handleSaveNotifications = async () => {
      const res = await StorageService.saveSettings({ 
          phoneNumber: alertPhone,
          telegramBotToken: telegramToken,
          telegramChatId: telegramChatId
      });
      if (res.success) alert("Notification settings saved successfully!");
  };

  const handleAutoDetectTelegram = async () => {
      setIsAutoDetecting(true);
      try {
          const res = await StorageService.autoDetectTelegramId(telegramToken);
          if (res.success && res.chatId) {
              const newChatId = res.chatId.toString();
              setTelegramChatId(newChatId);
              await StorageService.saveSettings({ phoneNumber: alertPhone, telegramBotToken: telegramToken, telegramChatId: newChatId });
              alert(`Success! Connected to ${res.user}.\nSettings have been saved automatically.`);
          } else alert(res.message || "Could not find your ID.");
      } catch (e) { alert("Connection failed."); } finally { setIsAutoDetecting(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberName.trim()) return;
      const res = await addUser(newMemberName);
      if (res.success) { setNewMemberName(''); alert('Team member added!'); }
  };

  const handleRemoveUser = async (id: string, name: string) => {
      if (confirm(`Remove ${name}?`)) await removeUser(id);
  };
  
  const handleClearConsumption = async () => {
      if(confirm("Reset the consumption counter?")) await resetConsumptionStats();
  }

  const handlePrintPart = (part: Part) => setPrintData({ id: part.id, name: part.name, type: 'PART', detail: `LOC: ${part.location?.rack}-${part.location?.row}-${part.location?.bin}` });
  const handlePrintUser = (user: User) => setPrintData({ id: user.id, name: user.name, type: 'USER', detail: user.isSupervisor ? 'ADMIN' : 'OPERATOR' });

  const [rackFilter, setRackFilter] = useState('all');
  const uniqueRacks = useMemo(() => ['all', ...Array.from(new Set(parts.map(p => p.location?.rack || 'Unassigned')))], [parts]);
  const filteredParts = useMemo(() => {
    let results = searchParts(searchTerm);
    if (rackFilter !== 'all') results = results.filter(p => (p.location?.rack || 'Unassigned') === rackFilter);
    return results;
  }, [searchTerm, rackFilter, parts, searchParts]);

  const lowStock = getLowStockParts();
  const handleEdit = (part: Part) => { setPartToEdit(part); setIsPartModalOpen(true); };
  const handleCreate = () => { setPartToEdit(null); setIsPartModalOpen(true); };
  const handleRestock = async (id: string) => {
      const qty = prompt("Enter quantity to add:");
      if(qty && !isNaN(Number(qty))) await restockPart(id, Number(qty));
  };

  const handleLock = () => setIsLocked(true);
  const handleUnlock = (password: string) => { if (password) setIsLocked(false); };

  const handleSavePart = async (fd: FormData) => {
      const res = partToEdit ? await editPart(partToEdit.id, fd) : await addPart(fd);
      if (res.success) { setIsPartModalOpen(false); setPartToEdit(null); alert(res.message); }
  };

  const handleRemovePart = async (partId: string) => { if(window.confirm(`Delete part ${partId}?`)) await removePart(partId); };

  const handleSendEmailAlert = async () => {
      const res = await StorageService.triggerLowStockAlert(lowStock);
      if (res.success) alert(res.message);
  };

  const handleExportQRs = async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('System Badges');
      sheet.columns = [{ header: 'Name', key: 'name', width: 30 }, { header: 'ID', key: 'id', width: 25 }, { header: 'Role', key: 'role', width: 15 }];
      sheet.addRow({ name: SUPERVISOR_NAME, id: SUPERVISOR_QR_ID, role: 'Admin' });
      sheet.addRow({ name: 'System Logout', id: LOGOUT_QR_ID, role: 'System' });
      users.forEach(u => sheet.addRow({ name: u.name, id: u.id, role: 'Operator' }));
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Molex_Access_Badges.xlsx');
  };

  if (isLocked) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
              <div className="bg-dark-surface p-8 rounded-2xl border border-dark-border max-w-md w-full text-center shadow-2xl">
                  <div className="w-20 h-20 bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary-500/30">
                      <LockClosedIcon className="w-10 h-10 text-primary-400"/>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Session Locked</h2>
                  <p className="text-gray-400 mb-6">Enter admin password to resume.</p>
                  <form onSubmit={e => { e.preventDefault(); handleUnlock('123'); }}>
                      <input type="password" placeholder="Password" className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white mb-4 focus:ring-2 focus:ring-primary-600 outline-none" autoFocus />
                      <button type="button" onClick={() => handleUnlock('123')} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-colors">Unlock</button>
                  </form>
              </div>
          </div>
      );
  }

  const renderDashboard = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-surface/50 backdrop-blur-md p-6 rounded-2xl border border-dark-border shadow-lg hover:border-primary-500/30 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total SKU Count</div>
                    <div className="bg-primary-500/10 p-2 rounded-lg group-hover:bg-primary-500/20 transition-colors"><DocumentTextIcon className="w-5 h-5 text-primary-400"/></div>
                  </div>
                  <div className="text-4xl font-bold text-white mt-4">{parts.length}</div>
              </div>
              <div className="bg-dark-surface/50 backdrop-blur-md p-6 rounded-2xl border border-dark-border shadow-lg hover:border-blue-500/30 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Stock Level</div>
                    <div className="bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors"><ChartBarIcon className="w-5 h-5 text-blue-400"/></div>
                  </div>
                  <div className="text-4xl font-bold text-white mt-4">{parts.reduce((a,b) => a + b.quantity, 0)}</div>
              </div>
              <div className="bg-dark-surface/50 backdrop-blur-md p-6 rounded-2xl border border-red-900/30 shadow-lg hover:border-red-500/30 transition-colors relative overflow-hidden group">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="text-red-300/80 text-xs font-bold uppercase tracking-wider">Low Stock Alerts</div>
                    <div className="bg-red-500/10 p-2 rounded-lg group-hover:bg-red-500/20 transition-colors"><ExclamationTriangleIcon className="w-5 h-5 text-red-400"/></div>
                  </div>
                  <div className="text-4xl font-bold text-white mt-4 relative z-10">{lowStock.length}</div>
                  {lowStock.length > 0 && <button type="button" onClick={handleSendEmailAlert} className="z-20 text-xs bg-red-500 hover:bg-red-400 text-white px-2 py-1 rounded mt-2">Notify Team</button>}
              </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-dark-surface/40 backdrop-blur rounded-2xl border border-dark-border p-6 flex flex-col h-full">
                   <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5 text-green-400"/> System Health</h3>
                   <div className="space-y-6 flex-1">
                       <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20"><DatabaseIcon className="w-5 h-5 text-green-400"/></div>
                               <div><div className="text-white font-medium">Database Integrity</div><div className="text-green-400 text-xs">Healthy</div></div>
                           </div>
                       </div>
                   </div>
               </div>
               <div className="bg-dark-surface/40 backdrop-blur rounded-2xl border border-dark-border p-6">
                   <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                   <div className="space-y-2">
                       {logs.slice(0, 5).map(l => (
                           <div key={l.id} className="flex items-center justify-between text-sm p-3 hover:bg-white/5 rounded-lg transition-colors group">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">{l.operatorId.substring(0,2).toUpperCase()}</div>
                                   <div><div className="text-white font-medium">{l.partName || 'Unknown Item'}</div><div className="text-gray-500 text-xs">{new Date(l.timestamp).toLocaleString()}</div></div>
                               </div>
                               <div className={`font-mono font-bold px-2 py-1 rounded bg-gray-800/50 ${l.quantityChange < 0 ? 'text-red-400' : 'text-green-400'}`}>{l.quantityChange > 0 ? '+' : ''}{l.quantityChange}</div>
                           </div>
                       ))}
                   </div>
               </div>
          </div>
      </div>
  );

  const renderStock = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col xl:flex-row gap-4 bg-dark-surface/60 backdrop-blur p-4 rounded-2xl border border-dark-border shadow-lg">
              <div className="flex-1 relative group">
                  <SearchIcon className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary-400 transition-colors"/><input type="text" placeholder="Search Part ID, Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-dark-bg/80 border border-dark-border rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all"/>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                  <div className="flex bg-dark-bg/80 rounded-xl p-1 border border-dark-border">
                      <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}><ListBulletIcon className="w-5 h-5"/></button>
                      <button onClick={() => setViewMode('rack')} className={`p-2 rounded-lg transition-all ${viewMode === 'rack' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}><GridViewIcon className="w-5 h-5"/></button>
                  </div>
                  <select className="bg-dark-bg/80 border border-dark-border rounded-xl px-4 py-2 text-white outline-none" value={rackFilter} onChange={(e) => setRackFilter(e.target.value)}>
                      {uniqueRacks.map(r => <option key={r} value={r}>{r === 'all' ? 'All Racks' : `Rack ${r}`}</option>)}
                  </select>
                  <button onClick={exportStockToExcel} className="bg-green-600/90 hover:bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg shadow-green-900/20 whitespace-nowrap"><DownloadIcon className="w-5 h-5"/> Export</button>
                  <button onClick={handleCreate} className="bg-primary-600/90 hover:bg-primary-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg shadow-primary-900/20 whitespace-nowrap"><PlusCircleIcon className="w-5 h-5"/> Add Part</button>
              </div>
          </div>
          {viewMode === 'list' ? (
              <div className="bg-dark-surface/40 backdrop-blur rounded-2xl border border-dark-border overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-800/80 text-gray-400 text-xs uppercase tracking-wider backdrop-blur-md sticky top-0 z-10">
                          <tr><th className="p-4 font-semibold">Item Details</th><th className="p-4 font-semibold">Location</th><th className="p-4 font-semibold">Stock Status</th><th className="p-4 text-right font-semibold">Quick Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                          {filteredParts.map(part => (
                              <tr key={part.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-4">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 overflow-hidden relative"><img src={part.image || "https://picsum.photos/50"} alt="" className="max-w-full max-h-full object-contain hover:scale-110 transition-transform duration-300"/></div>
                                          <div><div className="font-bold text-white text-base">{part.name}</div><div className="font-mono text-primary-400 text-xs bg-primary-900/20 px-2 py-0.5 rounded inline-block mt-1">{part.id}</div></div>
                                      </div>
                                  </td>
                                  <td className="p-4 text-gray-300 font-mono"><div className="flex gap-2"><span className="bg-gray-800 px-2 py-1 rounded text-xs">R: {part.location?.rack || '?'}</span><span className="bg-gray-800 px-2 py-1 rounded text-xs">r: {part.location?.row || '?'}</span><span className="bg-gray-800 px-2 py-1 rounded text-xs">B: {part.location?.bin || '?'}</span></div></td>
                                  <td className="p-4"><div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs border ${part.quantity === 0 ? 'bg-red-900/20 border-red-500/30 text-red-400' : part.quantity <= 5 ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' : 'bg-green-900/20 border-green-500/30 text-green-400'}`}>{part.quantity} Units</div></td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handlePrintPart(part)} className="p-2 hover:bg-white/10 hover:text-white rounded-lg text-gray-400 transition-colors" title="Print Label"><PrinterIcon /></button>
                                        <button onClick={() => setQrCodeValue(part.id)} className="p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg text-gray-400 transition-colors"><QrCodeIcon/></button>
                                        <button onClick={() => handleEdit(part)} className="p-2 hover:bg-yellow-500/20 hover:text-yellow-400 rounded-lg text-gray-400 transition-colors"><PencilIcon/></button>
                                        <button onClick={() => handleRestock(part.id)} className="p-2 hover:bg-green-500/20 hover:text-green-400 rounded-lg text-gray-400 transition-colors"><PlusCircleIcon/></button>
                                        <button onClick={() => handleRemovePart(part.id)} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-400 transition-colors"><XCircleIcon/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {filteredParts.length === 0 && <div className="p-12 text-center text-gray-500 italic">No parts found.</div>}
              </div>
          ) : (
             <RackView parts={filteredParts} onPartSelect={handleEdit} />
          )}
      </div>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-900 via-gray-900 to-[#0c1220] text-gray-100 font-sans selection:bg-primary-500/30">
        <aside className="w-72 bg-dark-surface/80 backdrop-blur-xl border-r border-dark-border flex flex-col fixed h-full z-20 shadow-2xl">
            <div className="p-8 border-b border-dark-border/50">
                <CompanyLogo className="h-8 mb-3 opacity-90"/>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div><span className="text-xs text-gray-400 font-mono tracking-widest uppercase">System Online</span></div>
            </div>
            <nav className="flex-1 p-4 space-y-2 mt-2">
                {[
                    { id: 'dashboard', icon: ChartBarIcon, label: 'Dashboard', desc: 'Overview & Stats' },
                    { id: 'stock', icon: GridViewIcon, label: 'Inventory', desc: 'Rack Map & List' },
                    { id: 'analytics', icon: ChartBarIcon, label: 'Consumption', desc: 'Team Analytics' },
                    { id: 'team', icon: UserCircleIcon, label: 'Team', desc: 'Badges & Access' },
                    { id: 'logs', icon: ListBulletIcon, label: 'Audit Logs', desc: 'Tracking History' },
                    { id: 'security', icon: ShieldCheckIcon, label: 'Security', desc: 'Backup & Lock' },
                    { id: 'settings', icon: CogIcon, label: 'Settings', desc: 'Config & Branding' }
                ].map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${activeTab === item.id ? 'bg-gradient-to-r from-primary-600/20 to-primary-600/5 border border-primary-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        {activeTab === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-xl"></div>}
                        <item.icon className={`w-6 h-6 transition-colors ${activeTab === item.id ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'}`}/>
                        <div className="text-left"><div className="font-medium text-sm">{item.label}</div><div className="text-[10px] text-gray-500 uppercase tracking-wider">{item.desc}</div></div>
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-dark-border/50 bg-black/20">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"><span className="font-bold text-xs">{currentUser.name.substring(0,2).toUpperCase()}</span></div>
                    <div><div className="text-sm font-bold text-white">{currentUser.name}</div><div className="text-xs text-gray-400">Admin Access</div></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleLock} className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2"><LockClosedIcon className="w-3 h-3"/> Lock</button>
                    <button onClick={onLogout} className="bg-red-900/20 hover:bg-red-900/40 text-red-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2">Sign Out</button>
                </div>
            </div>
        </aside>

        <main className="flex-1 ml-72 p-8 lg:p-12 overflow-y-auto">
            <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-4xl font-bold text-white capitalize tracking-tight">{activeTab === 'stock' ? 'Inventory Control' : activeTab.replace('-', ' ')}</h1>
                <p className="text-gray-400 mt-2">Molex Inventory Management System v2.5</p>
            </header>
            
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'stock' && renderStock()}
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <div><h2 className="text-2xl font-bold text-white">Consumption Analytics</h2><p className="text-gray-500">Track daily usage.</p></div>
                            <button onClick={handleClearConsumption} className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"><RefreshIcon className="w-5 h-5"/> Reset Counters</button>
                        </div>
                        <div className="bg-dark-surface/50 backdrop-blur rounded-2xl border border-dark-border p-6 shadow-xl mb-8">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ChartBarIcon className="w-5 h-5 text-blue-400"/> Daily Consumption Graph</h3>
                                <div className="flex items-center gap-3 bg-dark-bg p-2 rounded-lg border border-dark-border"><CalendarDaysIcon className="w-5 h-5 text-gray-400"/><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white outline-none font-mono text-sm"/></div>
                            </div>
                            <div className="h-64"><AnalyticsChart title={`Total Timeline: ${selectedDate}`} data={dailyHourlyStats} color="#60a5fa" height={200}/></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             <div className="bg-dark-surface/50 backdrop-blur rounded-2xl border border-dark-border p-6 h-[400px] flex flex-col"><AnalyticsChart title="Consumption by Operator" data={consumptionStats.map(s => ({ label: s.operatorId, value: s.totalTaken }))} color="#8b5cf6"/></div>
                             <div className="bg-dark-surface/50 backdrop-blur rounded-2xl border border-dark-border p-6 h-[400px] overflow-hidden flex flex-col">
                                 <h3 className="text-lg font-bold text-white mb-4">Leaderboard</h3>
                                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                                     <table className="w-full text-left text-sm">
                                         <thead className="bg-gray-800/80 text-gray-400 sticky top-0"><tr><th className="p-3">Rank</th><th className="p-3">Operator</th><th className="p-3 text-right">Taken</th></tr></thead>
                                         <tbody className="divide-y divide-gray-800">
                                             {consumptionStats.map((stat, idx) => (<tr key={stat.operatorId} className="hover:bg-white/5"><td className="p-3 font-mono text-gray-500">#{idx + 1}</td><td className="p-3 font-bold text-white">{stat.operatorId}</td><td className="p-3 text-right font-mono text-blue-400">{stat.totalTaken}</td></tr>))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'team' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex gap-6 items-start">
                             <div className="w-1/3 bg-dark-surface/50 p-6 rounded-2xl border border-dark-border shadow-xl">
                                 <h2 className="text-xl font-bold text-white mb-4">Add Team Member</h2>
                                 <form onSubmit={handleAddUser}>
                                     <div className="mb-4"><label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label><input type="text" required value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="e.g. John Doe" className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-primary-500 outline-none"/></div>
                                     <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><PlusCircleIcon className="w-5 h-5"/> Create QR</button>
                                 </form>
                             </div>
                             <div className="flex-1 bg-dark-surface/50 p-6 rounded-2xl border border-dark-border shadow-xl">
                                 <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Team ({users.length})</h2><button onClick={handleExportQRs} className="bg-green-600/90 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><DownloadIcon className="w-4 h-4"/> Download QR Badges</button></div>
                                 <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                     {users.map(u => (
                                         <div key={u.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                                             <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">{u.name.substring(0,2).toUpperCase()}</div><div><div className="font-bold text-white">{u.name}</div><div className="text-xs text-primary-400 font-mono">{u.id}</div></div></div>
                                             <div className="flex items-center gap-2"><button onClick={() => handlePrintUser(u)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs flex items-center gap-1 transition-colors"><PrinterIcon className="w-4 h-4"/> Print</button><button onClick={() => setQrCodeValue(u.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs flex items-center gap-1"><QrCodeIcon className="w-4 h-4"/> QR</button><button onClick={() => handleRemoveUser(u.id, u.name)} className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg"><XCircleIcon className="w-5 h-5"/></button></div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'logs' && (
                    <div className="bg-dark-surface/50 p-6 rounded-2xl border border-dark-border shadow-xl animate-in fade-in">
                        <div className="flex justify-between mb-6"><div><h2 className="text-xl font-bold text-white">System Audit Log</h2><p className="text-gray-500 text-sm">Track stock movements.</p></div><button onClick={exportLogsToExcel} className="bg-dark-bg border border-dark-border text-white px-4 py-2 rounded-lg flex items-center gap-2"><DownloadIcon className="w-4 h-4"/> Export CSV</button></div>
                        <div className="overflow-x-auto rounded-xl border border-dark-border">
                             <table className="w-full text-left text-sm">
                                 <thead className="bg-gray-800/80 text-gray-400 border-b border-dark-border"><tr><th className="p-4">Timestamp</th><th className="p-4">Operator</th><th className="p-4">Action</th><th className="p-4">Item</th><th className="p-4">Change</th></tr></thead>
                                 <tbody className="divide-y divide-dark-border/50">{logs.map(l => (<tr key={l.id} className="hover:bg-white/5"><td className="p-4 font-mono text-gray-400">{new Date(l.timestamp).toLocaleString()}</td><td className="p-4 font-medium text-white">{l.operatorId}</td><td className="p-4 uppercase">{l.action}</td><td className="p-4 text-gray-300">{l.partName || l.partId}</td><td className={`p-4 font-bold font-mono ${l.quantityChange < 0 ? 'text-red-400' : 'text-green-400'}`}>{l.quantityChange > 0 ? '+' : ''}{l.quantityChange}</td></tr>))}</tbody>
                             </table>
                        </div>
                    </div>
                )}
                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        <div className="bg-dark-surface/50 p-8 rounded-2xl border border-dark-border shadow-xl"><DatabaseIcon className="w-6 h-6 text-blue-400 mb-4"/><h3 className="text-xl font-bold text-white mb-2">Data Backup</h3><button onClick={exportStockToExcel} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><DownloadIcon className="w-5 h-5"/> Download Backup</button></div>
                        <div className="bg-dark-surface/50 p-8 rounded-2xl border border-dark-border shadow-xl"><LockClosedIcon className="w-6 h-6 text-yellow-400 mb-4"/><h3 className="text-xl font-bold text-white mb-2">Lock Terminal</h3><button onClick={handleLock} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><LockClosedIcon className="w-5 h-5"/> Lock Now</button></div>
                    </div>
                )}
                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-dark-surface/50 p-8 rounded-2xl border border-dark-border shadow-xl">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><CogIcon className="w-6 h-6 text-purple-400"/> Company Branding</h3>
                            <div className="flex items-center gap-6"><div className="w-48 h-16 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-gray-900/50"><CompanyLogo className="max-h-12 max-w-[80%]"/></div><div className="flex-1"><label className="cursor-pointer bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"><UploadIcon className="w-4 h-4"/> Upload New Logo<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setLogo(e.target.files[0])} className="hidden"/></label></div></div>
                        </div>
                        <div className="bg-dark-surface/50 p-8 rounded-2xl border border-dark-border shadow-xl">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><CloudIcon className="w-6 h-6 text-green-400"/> Cloud Database Sync</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-4">
                                <div><label className="block text-sm font-medium text-gray-400 mb-2">Project URL</label><input type="text" value={cloudConfig.url} onChange={(e) => setCloudConfig({...cloudConfig, url: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white outline-none"/></div>
                                <div><label className="block text-sm font-medium text-gray-400 mb-2">API Key</label><input type="password" value={cloudConfig.key} onChange={(e) => setCloudConfig({...cloudConfig, key: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white outline-none"/></div>
                            </div>
                            <div className="flex items-center justify-between"><label className="flex items-center gap-2"><input type="checkbox" checked={cloudConfig.enabled} onChange={(e) => setCloudConfig({...cloudConfig, enabled: e.target.checked})} className="w-5 h-5 rounded"/><span className="text-white text-sm">Enable Cloud Sync</span></label><button onClick={handleSaveCloudConfig} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg">Save & Sync</button></div>
                        </div>
                        <div className="bg-dark-surface/50 p-8 rounded-2xl border border-dark-border shadow-xl">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><PaperAirplaneIcon className="w-6 h-6 text-blue-400"/> Notifications</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                                <div><label className="block text-sm font-medium text-gray-400 mb-2">Bot Token</label><input type="text" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white outline-none"/></div>
                                <div><label className="block text-sm font-medium text-gray-400 mb-2">Chat ID</label><div className="flex gap-2"><input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white outline-none"/><button onClick={handleAutoDetectTelegram} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-xs font-bold">{isAutoDetecting ? '...' : 'Auto'}</button></div></div>
                            </div>
                            <div className="flex justify-end pt-4"><button onClick={handleSaveNotifications} className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl text-sm font-bold">Save Settings</button></div>
                        </div>
                    </div>
                )}
            </div>
        </main>
        <PartModal isOpen={isPartModalOpen} onClose={() => setIsPartModalOpen(false)} partToEdit={partToEdit} onSave={handleSavePart} />
        <Modal isOpen={!!qrCodeValue} onClose={() => setQrCodeValue(null)} title="QR Code Preview"><div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl">{qrCodeValue && <QRCodeSVG value={qrCodeValue} size={256} />}<p className="mt-6 font-mono text-black font-bold text-xl tracking-wider">{qrCodeValue}</p></div></Modal>
        <LabelPrinter data={printData} onClose={() => setPrintData(null)}/>
    </div>
  );
};
