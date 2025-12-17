
import React from 'react';

interface ChartProps {
    data: { label: string; value: number }[];
    title?: string;
    color?: string;
    height?: number;
}

export const AnalyticsChart: React.FC<ChartProps> = ({ data, title, color = '#3b82f6', height = 200 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500 bg-black/10 rounded-xl border border-dashed border-gray-700">
                <p className="text-sm">No data available.</p>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="w-full h-full flex flex-col">
            {title && <h4 className="text-white font-bold mb-4">{title}</h4>}
            <div className="flex-1 flex items-end gap-2" style={{ height: `${height}px` }}>
                {data.map((item, index) => {
                    const barHeight = (item.value / maxValue) * 100;
                    return (
                        <div key={index} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute -top-10 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700 shadow-lg">
                                {item.label}: {item.value}
                            </div>
                            <div className="w-full max-w-[40px] rounded-t-sm transition-all duration-500" style={{ height: `${barHeight}%`, backgroundColor: color, minHeight: '4px' }}></div>
                            <div className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">{item.label}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
