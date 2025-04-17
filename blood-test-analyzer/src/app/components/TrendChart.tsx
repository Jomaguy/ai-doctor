'use client'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, ReferenceLine, ReferenceArea, Area } from 'recharts'
import { format, parseISO } from 'date-fns'

interface Biomarker {
  value: number | null;
  unit?: string;
  referenceRange?: {
    min: number;
    max: number;
  };
}

interface AnalysisResult {
  date: string;
  biomarkers: Record<string, Biomarker>;
}

// Updated color scheme for biomarkers
const BIOMARKER_CONFIG = {
  Glucose: {
    stroke: '#2563EB',
    name: 'Glucose Level',
    unit: 'mg/dL'
  },
  Cholesterol: {
    stroke: '#22C55E',
    name: 'Total Cholesterol',
    unit: 'mg/dL'
  },
  HDL: {
    stroke: '#1E293B',
    name: 'HDL Cholesterol',
    unit: 'mg/dL'
  },
  LDL: {
    stroke: '#E0F2FE',
    name: 'LDL Cholesterol',
    unit: 'mg/dL'
  },
  Triglycerides: {
    stroke: '#EF4444',
    name: 'Triglycerides',
    unit: 'mg/dL'
  },
  Hemoglobin: {
    stroke: '#2563EB',
    name: 'Hemoglobin',
    unit: 'g/dL'
  },
  Creatinine: {
    stroke: '#22C55E',
    name: 'Creatinine',
    unit: 'mg/dL'
  }
} as const;

type BiomarkerKey = keyof typeof BIOMARKER_CONFIG;

export default function TrendChart({ data }: { data: AnalysisResult[] }) {
  console.log('TrendChart data:', data); // Add debugging to see what data is received
  
  const [selectedBiomarker, setSelectedBiomarker] = useState<BiomarkerKey | null>(null);

  // Find all available biomarkers in the data
  const availableBiomarkers = data.reduce((markers, entry) => {
    Object.keys(entry.biomarkers).forEach(key => {
      if (key in BIOMARKER_CONFIG && !markers.includes(key as BiomarkerKey)) {
        markers.push(key as BiomarkerKey);
      }
    });
    return markers;
  }, [] as BiomarkerKey[]);

  // Set initial biomarker if not selected yet
  if (selectedBiomarker === null && availableBiomarkers.length > 0) {
    setSelectedBiomarker(availableBiomarkers[0]);
  }

  // Transform data for the chart - one biomarker only
  const chartData = data.map(entry => {
    try {
      // Parse the ISO date string - ensure it's a valid date
      const dateString = entry.date;
      console.log('Processing date:', dateString); // Debug the date string
      
      // Parse date - handle potential format issues
      let date;
      try {
        date = parseISO(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.error('Invalid date after parsing:', dateString);
          date = new Date(); // Fallback to today if parse failed
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        date = new Date(); // Fallback to today
      }
      
      const formattedDate = format(date, 'MMM dd, yyyy');
      
      // Get the biomarker data if available
      const biomarkerValue = selectedBiomarker && entry.biomarkers[selectedBiomarker] 
        ? entry.biomarkers[selectedBiomarker].value 
        : null;
      
      return {
        date: formattedDate,
        rawDate: date, // Keep raw date for sorting
        value: biomarkerValue,
        // Add unit for tooltip display
        unit: selectedBiomarker ? BIOMARKER_CONFIG[selectedBiomarker].unit : ''
      };
    } catch (error) {
      console.error('Error processing chart data entry:', error);
      return {
        date: 'Unknown Date',
        rawDate: new Date(),
        value: null,
        unit: ''
      };
    }
  }).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()); // Sort by date

  console.log('Processed chart data:', chartData); // Debug the processed data

  const biomarkerName = selectedBiomarker ? BIOMARKER_CONFIG[selectedBiomarker].name : '';
  const biomarkerUnit = selectedBiomarker ? BIOMARKER_CONFIG[selectedBiomarker].unit : '';
  const biomarkerColor = selectedBiomarker ? BIOMARKER_CONFIG[selectedBiomarker].stroke : '#2563EB';

  // Get reference range for the selected biomarker
  const getReferenceRange = () => {
    if (!selectedBiomarker) return null;
    
    // Try to find reference range from the first data point that has it
    for (const entry of data) {
      const biomarker = entry.biomarkers[selectedBiomarker];
      if (biomarker && biomarker.referenceRange) {
        console.log('Found reference range:', biomarker.referenceRange);
        return biomarker.referenceRange;
      }
    }
    
    // If no reference range found in data, use defaults from biomarker definitions
    if (selectedBiomarker === 'Glucose') {
      console.log('Using default reference range for Glucose');
      return { min: 70, max: 100 };
    } else if (selectedBiomarker === 'Cholesterol') {
      return { min: 125, max: 200 };
    } else if (selectedBiomarker === 'HDL') {
      return { min: 40, max: 60 };
    } else if (selectedBiomarker === 'LDL') {
      return { min: 0, max: 100 };
    } else if (selectedBiomarker === 'Triglycerides') {
      return { min: 0, max: 150 };
    } else if (selectedBiomarker === 'Hemoglobin') {
      return { min: 12, max: 17 };
    } else if (selectedBiomarker === 'Creatinine') {
      return { min: 0.6, max: 1.2 };
    }
    
    console.log('No reference range found for:', selectedBiomarker);
    return null;
  };
  
  const referenceRange = getReferenceRange();
  console.log('Using reference range:', referenceRange);
  
  // Memoize calculateYDomain to avoid dependency issues
  const memoizedCalculateYDomain = () => {
    if (!referenceRange) return [0, 100];
    
    // Find min and max values in the data
    let minValue = Number.MAX_VALUE;
    let maxValue = Number.MIN_VALUE;
    
    chartData.forEach(entry => {
      if (entry.value !== null) {
        minValue = Math.min(minValue, entry.value);
        maxValue = Math.max(maxValue, entry.value);
      }
    });
    
    // If we have a reference range, include it in the domain
    minValue = Math.min(minValue, referenceRange.min * 0.8); // Add padding below min
    maxValue = Math.max(maxValue, referenceRange.max * 1.2); // Add padding above max
    
    // Fallback if no values were found
    if (minValue === Number.MAX_VALUE || maxValue === Number.MIN_VALUE) {
      return [0, 100];
    }
    
    return [Math.max(0, minValue * 0.8), maxValue * 1.2]; // Add padding and ensure min is not negative
  };
  
  // Use memoized domain calculation
  const yDomain = memoizedCalculateYDomain();
  
  // Helper function to calculate vertical position percentage
  const calculateYPosition = (value: number) => {
    const domain = yDomain;
    const total = domain[1] - domain[0];
    
    // The chart's y-axis is inverted (top is lowest value, bottom is highest value)
    // We need to calculate percentage from top
    const position = Math.max(0, Math.min(100, ((domain[1] - value) / total) * 100));
    
    console.log(`Position for value ${value}:`, {
      domain,
      total,
      calculatedPosition: position
    });
    
    return position;
  };
  
  // Debug logging
  useEffect(() => {
    if (referenceRange) {
      console.log('Reference Range:', referenceRange);
      console.log('Domain:', yDomain);
    }
  }, [referenceRange, yDomain]);

  // Custom tooltip to show date and value with units
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isHealthy = referenceRange && 
        value >= referenceRange.min && 
        value <= referenceRange.max;
      
      return (
        <div className="bg-white p-3 border border-[#E0F2FE] rounded shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          <p className={`font-bold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
            {value} {payload[0].payload.unit}
            {referenceRange && (
              <span className="text-xs font-normal block text-gray-500">
                Reference: {referenceRange.min} - {referenceRange.max} {payload[0].payload.unit}
              </span>
            )}
          </p>
          {referenceRange && (
            <p className="text-xs mt-1">
              {isHealthy ? 
                '✅ Within healthy range' : 
                '⚠️ Outside healthy range'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Fixed background colors with better opacity
  const healthyColor = 'rgba(187, 247, 208, 0.8)'; // Light green
  const unhealthyColor = 'rgba(254, 202, 202, 0.8)'; // Light red

  return (
    <div className="space-y-4">
      {/* Biomarker selector */}
      <div className="flex flex-wrap gap-2">
        {availableBiomarkers.map(biomarker => (
          <button
            key={biomarker}
            onClick={() => setSelectedBiomarker(biomarker)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedBiomarker === biomarker
                ? `bg-[${BIOMARKER_CONFIG[biomarker].stroke}] text-white`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ 
              backgroundColor: selectedBiomarker === biomarker ? BIOMARKER_CONFIG[biomarker].stroke : undefined 
            }}
          >
            {BIOMARKER_CONFIG[biomarker].name}
          </button>
        ))}
      </div>
      
      {/* Chart container with custom background gradient */}
      <div className="w-full h-[400px] bg-white rounded-lg p-4 relative">
        {selectedBiomarker && chartData.length > 0 ? (
          <>
            {/* Custom color backgrounds with fixed positions */}
            {referenceRange && (
              <div className="absolute z-0 rounded-md overflow-hidden" style={{ top: 20, left: 55, right: 45, bottom: 35 }}>
                {/* Top red zone (above max) */}
                <div 
                  className="absolute w-full" 
                  style={{ 
                    top: 0,
                    height: `${calculateYPosition(referenceRange.max)}%`,
                    backgroundColor: unhealthyColor
                  }}
                />
                
                {/* Middle green zone (healthy range) */}
                <div 
                  className="absolute w-full" 
                  style={{ 
                    top: `${calculateYPosition(referenceRange.max)}%`,
                    height: `${calculateYPosition(referenceRange.min) - calculateYPosition(referenceRange.max)}%`,
                    backgroundColor: healthyColor
                  }}
                />
                
                {/* Bottom red zone (below min) */}
                <div 
                  className="absolute w-full" 
                  style={{ 
                    top: `${calculateYPosition(referenceRange.min)}%`,
                    height: `${100 - calculateYPosition(referenceRange.min)}%`,
                    backgroundColor: unhealthyColor
                  }}
                />
              </div>
            )}
            
            {/* Chart with transparent background */}
            <div className="relative z-10 h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
                  
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#1E293B' }}
                    stroke="#1E293B"
                  />
                  <YAxis 
                    tick={{ fill: '#1E293B' }}
                    stroke="#1E293B"
                    domain={yDomain}
                  >
                    <Label 
                      value={biomarkerUnit} 
                      position="left" 
                      angle={-90} 
                      style={{ textAnchor: 'middle', fill: '#1E293B' }}
                      offset={-5}
                    />
                  </YAxis>
                  
                  {/* Reference lines for min and max values */}
                  {referenceRange && (
                    <>
                      <ReferenceLine 
                        y={referenceRange.min} 
                        stroke="#16A34A" 
                        strokeDasharray="3 3" 
                        strokeWidth={2}
                        label={{ 
                          value: `Min: ${referenceRange.min}`, 
                          position: 'insideBottomLeft',
                          fill: '#16A34A',
                          fontSize: 12
                        }} 
                      />
                      <ReferenceLine 
                        y={referenceRange.max} 
                        stroke="#DC2626" 
                        strokeDasharray="3 3" 
                        strokeWidth={2}
                        label={{ 
                          value: `Max: ${referenceRange.max}`, 
                          position: 'insideTopLeft',
                          fill: '#DC2626',
                          fontSize: 12
                        }} 
                      />
                    </>
                  )}
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* The data line */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={biomarkerColor}
                    name={biomarkerName}
                    dot={{ r: 6, fill: biomarkerColor }}
                    activeDot={{ r: 8, fill: biomarkerColor }}
                    strokeWidth={3}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            {availableBiomarkers.length === 0 
              ? "No biomarker data available" 
              : "Select a biomarker to view trends"}
          </div>
        )}
      </div>
      
      {/* Legend explaining the colors */}
      {referenceRange && (
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded" style={{ backgroundColor: healthyColor }}></span>
            <span>Healthy range</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-4 h-4 mr-2 rounded" style={{ backgroundColor: unhealthyColor }}></span>
            <span>Outside healthy range</span>
          </div>
        </div>
      )}
    </div>
  );
} 