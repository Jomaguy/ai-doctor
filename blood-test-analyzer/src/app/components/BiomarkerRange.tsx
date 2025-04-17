'use client'
import React from 'react'

interface RangeProps {
  min: number;
  max: number;
}

export interface BiomarkerRangeProps {
  name: string;
  value: number | null;
  unit?: string;
  referenceRange?: {
    min: number;
    max: number;
  };
  criticalLow?: number;
  low?: number;
  high?: number;
  criticalHigh?: number;
}

export default function BiomarkerRange({
  name,
  value,
  unit,
  referenceRange,
  criticalLow = referenceRange ? referenceRange.min * 0.7 : undefined,
  low = referenceRange?.min,
  high = referenceRange?.max,
  criticalHigh = referenceRange ? referenceRange.max * 1.3 : undefined,
}: BiomarkerRangeProps) {
  if (value === null) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md mb-4 border border-[#E0F2FE]">
        <h3 className="text-lg font-medium text-[#1E293B] mb-2">{name}</h3>
        <p className="text-[#EF4444]">Value not found</p>
      </div>
    )
  }

  // Calculate where the marker should be positioned
  const calculatePosition = () => {
    if (!criticalLow || !criticalHigh) return 50; // Default to middle
    
    const totalRange = criticalHigh - criticalLow;
    const position = ((value - criticalLow) / totalRange) * 100;
    
    // Constrain between 0-100%
    return Math.max(0, Math.min(100, position));
  }

  // Determine which range section the value falls in
  const getValueZone = () => {
    if (criticalLow !== undefined && value < criticalLow) return 'critical-low';
    if (low !== undefined && value < low) return 'low';
    if (high !== undefined && value > high) return 'high';
    if (criticalHigh !== undefined && value > criticalHigh) return 'critical-high';
    return 'normal';
  }

  const valueZone = getValueZone();
  const markerPosition = calculatePosition();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md mb-4 border border-[#E0F2FE]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium text-[#1E293B]">{name}</h3>
        <div className="bg-[#00695C] text-white rounded-full w-24 h-24 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold">{value}</span>
          <span className="text-sm">{unit}</span>
        </div>
      </div>
      
      {/* Range indicator */}
      <div className="relative h-8 mt-4 mb-2">
        {/* Range bar */}
        <div className="absolute w-full h-2 flex rounded-md overflow-hidden">
          <div className="bg-[#EF4444] h-full flex-1" 
               style={{ flexBasis: criticalLow && low ? `${((low - criticalLow) / (criticalHigh! - criticalLow!)) * 100}%` : '25%' }}>
          </div>
          <div className="bg-[#FCD34D] h-full flex-1"
               style={{ flexBasis: low && high ? `${((high - low) / (criticalHigh! - criticalLow!)) * 100}%` : '25%' }}>
          </div>
          <div className="bg-[#10B981] h-full flex-1"
               style={{ flexBasis: high && criticalHigh ? `${((criticalHigh - high) / (criticalHigh - criticalLow!)) * 100}%` : '25%' }}>
          </div>
          <div className="bg-[#EF4444] h-full flex-1"
               style={{ flexBasis: '25%' }}>
          </div>
        </div>
        
        {/* Marker */}
        <div 
          className="absolute w-0 h-0 transform -translate-x-1/2"
          style={{ 
            left: `${markerPosition}%`, 
            top: '-4px', 
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '12px solid #00695C'
          }}
        ></div>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-[#1E293B] mt-1">
        <div className="text-center">
          <div>Critical Low</div>
          <div className="font-medium">{criticalLow ? `<${criticalLow}` : 'N/A'}</div>
        </div>
        <div className="text-center">
          <div>Low</div>
          <div className="font-medium">{low && criticalLow ? `${criticalLow} - ${low}` : 'N/A'}</div>
        </div>
        <div className="text-center">
          <div>In Range</div>
          <div className="font-medium">{low && high ? `${low} - ${high}` : 'N/A'}</div>
        </div>
        <div className="text-center">
          <div>High</div>
          <div className="font-medium">{high ? `>${high}` : 'N/A'}</div>
        </div>
      </div>
    </div>
  )
} 