
import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MolexLogo } from '../Icons';

interface LabelPrinterProps {
  data: {
    id: string;
    name: string;
    type: 'USER' | 'PART';
    detail?: string;
  } | null;
  onClose: () => void;
}

export const LabelPrinter: React.FC<LabelPrinterProps> = ({ data, onClose }) => {
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center print:bg-white print:p-0 print:static print:block">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center print:hidden">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Print Label Preview</h2>
            <div className="border-2 border-dashed border-gray-300 p-4 mb-6 rounded-lg bg-gray-50 flex justify-center">
                <div className="w-[300px] h-[150px] bg-white border border-gray-900 flex items-center p-2 gap-2 shadow-sm">
                     <div className="h-full aspect-square flex items-center justify-center"><QRCodeSVG value={data.id} size={90} /></div>
                     <div className="flex-1 text-left overflow-hidden">
                        <MolexLogo className="h-4 mb-1" />
                        <div className="text-xs font-bold text-black leading-tight uppercase line-clamp-2">{data.name}</div>
                        <div className="text-[10px] font-mono text-gray-600 mt-1">{data.id}</div>
                        {data.detail && <div className="text-[10px] text-gray-800 font-medium mt-1">{data.detail}</div>}
                     </div>
                </div>
            </div>
            <div className="flex gap-3 justify-center">
                <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors">Cancel</button>
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors">Print Label</button>
            </div>
        </div>
        <div id="print-area" className="hidden print:flex print:items-center print:justify-center print:w-full print:h-full print:absolute print:top-0 print:left-0 print:bg-white">
            <div className="flex flex-row items-center justify-between w-full h-full p-1 max-w-[95%] max-h-[95%]">
                <div className="flex-shrink-0 mr-2"><QRCodeSVG value={data.id} size={100} /></div>
                <div className="flex-1 flex flex-col justify-center text-left overflow-hidden">
                    <div className="mb-1"><span className="font-black text-lg tracking-tighter">MOLEX</span></div>
                    <div className="font-bold text-sm leading-tight uppercase mb-1">{data.name}</div>
                    <div className="font-mono text-xs font-bold">{data.id}</div>
                    {data.detail && <div className="text-xs mt-1 border-t border-black pt-1">{data.detail}</div>}
                </div>
            </div>
        </div>
    </div>
  );
};
