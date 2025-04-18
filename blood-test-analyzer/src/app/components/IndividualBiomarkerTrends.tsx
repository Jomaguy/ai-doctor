'use client'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, ReferenceLine, ReferenceArea } from 'recharts'
import { format, parseISO } from 'date-fns'

interface Biomarker {
  value: number | null;
  unit?: string;
  referenceRange?: {
    min: number;
    max: number;
  };
  orderIndex?: number; // Add orderIndex to track original position in report
  description?: string; // Add description field
}

interface AnalysisResult {
  date: string;
  biomarkers: Record<string, Biomarker>;
  originalOrder?: string[]; // Store the original order of biomarkers
}

// Color scheme for biomarkers
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

type BiomarkerKey = keyof typeof BIOMARKER_CONFIG | string;

// List of known valid biomarkers - this ensures we only display actual human biomarkers
const VALID_BIOMARKERS = [
  // Blood Cell Counts and Measurements
  'Hemoglobin', 'Hematocrit', 'Mean Cell Hemoglobin', 'Mean Cell Hemoglobin Concentration',
  'Mean Cell Volume', 'Red Blood Cells', 'Basophils', 'Eosinophils', 'Lymphocytes',
  'Monocytes', 'Neutrophils', 'White Blood Cells', 'Platelets', 'Ferritin',
  
  // Lipid Panel
  'Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides',
  'Cholesterol', 'LDL', 'HDL',
  
  // Inflammation Markers
  'High Sensitivity C-Reactive Protein', 'hsCRP', 'High Sensitivity C-Reactive Protein (hsCRP)',
  'CRP', 'ESR', 'C-Reactive Protein',
  
  // Muscle and Enzyme Markers
  'Creatine Kinase', 'Creatine Kinase (CK-NAC)', 'CK-NAC',
  
  // Glucose Metabolism
  'Glucose', 'HbA1c', 'A1C', 'Insulin',
  
  // Kidney Function
  'Albumin', 'Calcium', 'Calcium (adjusted)', 'Creatinine', 'Cystatin C',
  'Estimated Glomerular Filtration Rate', 'eGFR', 'Estimated Glomerular Filtration Rate (eGFR)',
  'Magnesium', 'Potassium', 'PotassiumCT', 'Sodium', 'SodiumCT',
  'Urea', 'BUN', 'Urea (BUN)', 'Chloride', 'Phosphorus',
  
  // Liver Function
  'Alanine Aminotransferase', 'ALT', 'Alanine Aminotransferase (ALT)',
  'Alkaline Phosphatase', 'ALP', 'Alkaline Phosphatase (ALP)',
  'Aspartate Aminotransferase', 'AST', 'AST/GOT', 'Aspartate Aminotransferase (AST/GOT)',
  'Copper', 'Gamma-Glutamyltransferase', 'GGT', 'Gamma-Glutamyltransferase (GGT)',
  'Total Bilirubin', 'Bilirubin', 'Protein',
  
  // Vitamins and Minerals
  'Folic acid', 'Folate', 'Folic acid/Folate', 'Vitamin C deficiency', 'Vitamin C deficiencyRH',
  'Vitamin B12', 'Vitamin D', 'Vitamin D, 25 Hydroxy', 'Zinc', 'ZincRH', 'Iron', 'Uric Acid',
  
  // Thyroid Function
  'Free Thyroxine', 'FT4', 'Free Thyroxine (FT4)',
  'Free Tri-iodothyronine', 'FT3', 'Free Tri-iodothyronine (FT3)',
  'Thyroid Stimulating Hormone', 'TSH', 'Thyroid Stimulating Hormone (TSH)',
  'T3', 'T4',
  
  // Sex Hormones
  'Sex Hormone Binding Globulin', 'SHBG', 'Sex Hormone Binding Globulin (SHBG)',
  'Testosterone', 'Testosterone, Total', 'Estradiol',
  
  // Cancer Markers
  'Total Prostate Specific Antigen', 'TPSA', 'Total Prostate Specific Antigen (TPSA)',
  
  // Additional Biomarkers
  'Immunoglobulin E', 'IgE', 'Immunoglobulin E (IgE)',
  'MCV', 'MCH', 'MCHC', 'RDW'
];

// The preferred order of biomarkers as specified by the user
const PREFERRED_BIOMARKER_ORDER = [
  'Hemoglobin',
  'Hematocrit',
  'Mean Cell Hemoglobin',
  'Mean Cell Hemoglobin Concentration',
  'Mean Cell Volume',
  'Red Blood Cells',
  'Basophils',
  'Eosinophils',
  'Lymphocytes',
  'Monocytes',
  'Neutrophils',
  'White Blood Cells',
  'Platelets',
  'Ferritin',
  'Total Cholesterol',
  'LDL Cholesterol',
  'HDL Cholesterol',
  'Triglycerides',
  'High Sensitivity C-Reactive Protein (hsCRP)',
  'Creatine Kinase (CK-NAC)',
  'Glucose',
  'HbA1c',
  'Albumin',
  'Calcium (adjusted)',
  'Creatinine',
  'Cystatin C',
  'Estimated Glomerular Filtration Rate (eGFR)',
  'Magnesium',
  'PotassiumCT',
  'SodiumCT',
  'Urea (BUN)',
  'Alanine Aminotransferase (ALT)',
  'Alkaline Phosphatase (ALP)',
  'Aspartate Aminotransferase (AST/GOT)',
  'Copper',
  'Gamma-Glutamyltransferase (GGT)',
  'Total Bilirubin',
  'Folic acid/Folate',
  'Vitamin C deficiencyRH',
  'Vitamin B12',
  'Vitamin D, 25 Hydroxy',
  'ZincRH',
  'Immunoglobulin E (IgE)',
  'Free Thyroxine (FT4)',
  'Free Tri-iodothyronine (FT3)',
  'Thyroid Stimulating Hormone (TSH)',
  'Sex Hormone Binding Globulin (SHBG)',
  'Testosterone, Total',
  'Estradiol',
  'Total Prostate Specific Antigen (TPSA)'
];

// Map of alternate names to the canonical name
const BIOMARKER_NAME_MAP: Record<string, string> = {
  // Blood Cell Counts
  'MCH': 'Mean Cell Hemoglobin',
  'MCHC': 'Mean Cell Hemoglobin Concentration',
  'MCV': 'Mean Cell Volume',
  'RBC': 'Red Blood Cells',
  'WBC': 'White Blood Cells',
  'Mean Cell Hemoglobin Concentration Low': 'Mean Cell Hemoglobin Concentration',
  'Basophils High': 'Basophils',
  
  // Common Variations
  'HDL': 'HDL Cholesterol',
  'LDL': 'LDL Cholesterol',
  'Cholesterol': 'Total Cholesterol',
  'A1C': 'HbA1c',
  'Hemoglobin A1c': 'HbA1c',
  
  // Kidney Function
  'BUN': 'Urea (BUN)',
  'Urea': 'Urea (BUN)',
  'Creatinine High': 'Creatinine',
  'Potassium High': 'Potassium',
  'PotassiumCT': 'Potassium',
  'SodiumCT': 'Sodium',
  
  // Liver Function
  'ALT': 'Alanine Aminotransferase (ALT)',
  'AST': 'Aspartate Aminotransferase (AST/GOT)',
  'ALP': 'Alkaline Phosphatase (ALP)',
  'GGT': 'Gamma-Glutamyltransferase (GGT)',
  'Bilirubin': 'Total Bilirubin',
  'Albumin High': 'Albumin',
  
  // Vitamins and Minerals
  'Folate': 'Folic acid/Folate',
  'Folic acid': 'Folic acid/Folate',
  'Vitamin D': 'Vitamin D, 25 Hydroxy',
  'Zinc High': 'Zinc',
  'ZincRH': 'Zinc',
  
  // Inflammation Markers
  'CRP': 'High Sensitivity C-Reactive Protein (hsCRP)',
  'hsCRP': 'High Sensitivity C-Reactive Protein (hsCRP)',
  'C-Reactive Protein': 'High Sensitivity C-Reactive Protein (hsCRP)',
  
  // Thyroid Function
  'TSH': 'Thyroid Stimulating Hormone (TSH)',
  'FT4': 'Free Thyroxine (FT4)',
  'FT3': 'Free Tri-iodothyronine (FT3)',
  
  // Sex Hormones
  'SHBG': 'Sex Hormone Binding Globulin (SHBG)',
  'Testosterone': 'Testosterone, Total'
};

// Function to clean biomarker name
const cleanBiomarkerName = (name: string): string => {
  // Remove newline characters and their surrounding spaces
  let cleaned = name.replace(/\s*↵\s*/g, ' ');
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Trim whitespace
  cleaned = cleaned.trim();
  return cleaned;
};

// Function to normalize biomarker name to the canonical form
const normalizeBiomarkerName = (name: string): string => {
  // Remove newline characters and their surrounding spaces
  let cleaned = name.replace(/\s*↵\s*/g, ' ');
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Remove any trailing "High" or "Low" indicators while preserving the base name
  const baseName = cleaned.replace(/\s*(High|Low)$/i, '').trim();
  
  // Check if there's a direct mapping for this name
  if (cleaned in BIOMARKER_NAME_MAP) {
    return BIOMARKER_NAME_MAP[cleaned];
  }
  
  if (baseName in BIOMARKER_NAME_MAP) {
    return BIOMARKER_NAME_MAP[baseName];
  }
  
  // Special cases for fragmented names
  if (baseName === 'Hydroxy') {
    return 'Vitamin D, 25 Hydroxy';
  }
  
  // Check if any known biomarker is contained within this name
  const matchingNames = PREFERRED_BIOMARKER_ORDER.filter(biomarker => 
    cleaned.toLowerCase().includes(biomarker.toLowerCase())
  );
  
  if (matchingNames.length > 0) {
    // Return the longest matching name (most specific)
    return matchingNames.sort((a, b) => b.length - a.length)[0];
  }
  
  return cleaned;
};

// Helper function to determine if a biomarker is valid
const isValidBiomarker = (name: string): boolean => {
  // Remove newline characters and their surrounding spaces
  let cleaned = name.replace(/\s*↵\s*/g, ' ');
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Standalone words that should not be considered biomarkers
  const standaloneExclusions = [
    'high', 'low', 'normal', 'optimal', 'reference', 'range', 
    'results', 'elevated', 'decreased', 'value', 'test', 'standard',
    'pending', 'final', 'see', 'note', 'positive', 'negative'
  ];
  
  // Reject if it's just a standalone excluded word
  if (standaloneExclusions.includes(cleaned.toLowerCase())) {
    return false;
  }
  
  // List of names to explicitly exclude
  const excludedNames = [
    'inflammation',
    'optimal',
    'syndrome',
    'results',
    'thyroid',
    'test',
    'report'
  ];
  
  // Check if the name is in the excluded list
  if (excludedNames.includes(cleaned.toLowerCase())) {
    return false;
  }
  
  // Remove any trailing "High" or "Low" indicators while preserving the base name
  const baseName = cleaned.replace(/\s*(High|Low)$/i, '').trim();
  
  // Check if it's in our predefined list (case-insensitive)
  const isInList = VALID_BIOMARKERS.some(
    validName => {
      const normalizedName = baseName.toLowerCase();
      const normalizedValid = validName.toLowerCase();
      return normalizedName === normalizedValid ||
             normalizedName.includes(normalizedValid) ||
             normalizedValid.includes(normalizedName);
    }
  );
  
  // Check if it's in our configuration
  const isInConfig = baseName in BIOMARKER_CONFIG;
  
  // Check if it's in our name mapping
  const isInMapping = baseName in BIOMARKER_NAME_MAP;
  
  // Additional checks for biomarker-like naming patterns
  const isBiomarkerPattern = (name: string): boolean => {
    const words = name.split(/\s+/);
    if (words.length > 5) return false;
    
    const nonBiomarkerWords = [
      'com', 'health', 'california', 'ca', 'randox', 'monica', 'santa',
      'center', 'medical', 'clinic', 'laboratories', 'diagnostic', 'inc',
      'ltd', 'llc', 'corporation', 'test', 'report', 'page', 'date',
      'results', 'thyroid', 'syndrome', 'optimal', 'inflammation'
    ];
    
    if (words.some(word => nonBiomarkerWords.includes(word.toLowerCase()))) {
      return false;
    }
    
    return true;
  };
  
  return isInList || isInConfig || isInMapping || isBiomarkerPattern(baseName);
};

// Create a single chart for a biomarker
function BiomarkerChart({ data, biomarkerName }: { data: AnalysisResult[], biomarkerName: string }) {
  // Determine if this is a known biomarker with predefined config
  const isKnownBiomarker = biomarkerName in BIOMARKER_CONFIG;
  const displayName = isKnownBiomarker 
    ? BIOMARKER_CONFIG[biomarkerName as keyof typeof BIOMARKER_CONFIG].name 
    : biomarkerName;
  
  const chartColor = isKnownBiomarker 
    ? BIOMARKER_CONFIG[biomarkerName as keyof typeof BIOMARKER_CONFIG].stroke 
    : '#2563EB'; // Default color
  
  // Get unit from data or config
  let unit = '';
  if (isKnownBiomarker) {
    unit = BIOMARKER_CONFIG[biomarkerName as keyof typeof BIOMARKER_CONFIG].unit;
  } else {
    // Try to get unit from first data point that has this biomarker
    for (const entry of data) {
      if (entry.biomarkers[biomarkerName]?.unit) {
        unit = entry.biomarkers[biomarkerName].unit || '';
        break;
      }
    }
  }

  // Transform data for the chart
  const chartData = data.map(entry => {
    try {
      // Parse the ISO date string
      const dateString = entry.date;
      
      // Parse date - handle potential format issues
      let date;
      try {
        date = parseISO(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          date = new Date(); // Fallback to today if parse failed
        }
      } catch (error) {
        date = new Date(); // Fallback to today
      }
      
      const formattedDate = format(date, 'MMM dd, yyyy');
      
      // Get the biomarker data if available
      const biomarkerValue = entry.biomarkers[biomarkerName] 
        ? entry.biomarkers[biomarkerName].value 
        : null;
      
      return {
        date: formattedDate,
        rawDate: date, // Keep raw date for sorting
        value: biomarkerValue,
        unit: unit
      };
    } catch (error) {
      return {
        date: 'Unknown Date',
        rawDate: new Date(),
        value: null,
        unit: ''
      };
    }
  }).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()); // Sort by date

  // Filter out entries with null values
  const validChartData = chartData.filter(entry => entry.value !== null);
  
  // Skip rendering if no valid data points
  if (validChartData.length < 1) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md border border-[#E0F2FE] text-center">
        <h3 className="text-lg font-medium text-[#1E293B] mb-2">{displayName}</h3>
        <p className="text-[#64748B]">No data available for this biomarker</p>
      </div>
    );
  }

  // Get reference range
  const getReferenceRange = () => {
    // Try to find reference range from the first data point that has it
    for (const entry of data) {
      const biomarker = entry.biomarkers[biomarkerName];
      if (biomarker && biomarker.referenceRange) {
        return biomarker.referenceRange;
      }
    }
    
    // If no reference range found in data, use defaults from biomarker definitions if available
    if (isKnownBiomarker) {
      const knownBiomarker = biomarkerName as keyof typeof BIOMARKER_CONFIG;
      if (knownBiomarker === 'Glucose') {
        return { min: 70, max: 100 };
      } else if (knownBiomarker === 'Cholesterol') {
        return { min: 125, max: 200 };
      } else if (knownBiomarker === 'HDL') {
        return { min: 40, max: 60 };
      } else if (knownBiomarker === 'LDL') {
        return { min: 0, max: 100 };
      } else if (knownBiomarker === 'Triglycerides') {
        return { min: 0, max: 150 };
      } else if (knownBiomarker === 'Hemoglobin') {
        return { min: 12, max: 17 };
      } else if (knownBiomarker === 'Creatinine') {
        return { min: 0.6, max: 1.2 };
      }
    }
    
    return null;
  };
  
  const referenceRange = getReferenceRange();
  
  // Calculate Y-axis domain
  const calculateYDomain = () => {
    if (!referenceRange) {
      // Find min and max values in the data
      let minValue = Math.min(...validChartData.map(entry => entry.value || 0));
      let maxValue = Math.max(...validChartData.map(entry => entry.value || 0));
      
      // Add padding
      minValue = Math.max(0, minValue * 0.8); // Ensure non-negative
      maxValue = maxValue * 1.2;
      
      return [minValue, maxValue];
    }
    
    // Find min and max values in the data
    let minValue = Math.min(...validChartData.map(entry => entry.value || 0));
    let maxValue = Math.max(...validChartData.map(entry => entry.value || 0));
    
    // Include reference range in domain
    minValue = Math.min(minValue, referenceRange.min * 0.8);
    maxValue = Math.max(maxValue, referenceRange.max * 1.2);
    
    return [Math.max(0, minValue * 0.8), maxValue * 1.2]; // Add padding and ensure min is not negative
  };
  
  const yDomain = calculateYDomain();

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

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-[#E0F2FE]">
      <h3 className="text-lg font-medium text-[#1E293B] mb-4">{displayName}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={validChartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              domain={yDomain as [number, number]}
              tick={{ fontSize: 12 }}
              width={60}
            >
              <Label 
                angle={-90}
                position="insideLeft"
                style={{ textAnchor: 'middle', fontSize: 12 }}
                value={unit}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
              isAnimationActive={true}
              animationDuration={1000}
            />
            {referenceRange && (
              <>
                <ReferenceLine 
                  y={referenceRange.min} 
                  stroke="#F59E0B" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: "Min", 
                    position: "left",
                    fontSize: 10,
                    fill: "#F59E0B"
                  }} 
                />
                <ReferenceLine 
                  y={referenceRange.max} 
                  stroke="#F59E0B" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: "Max", 
                    position: "left",
                    fontSize: 10,
                    fill: "#F59E0B"
                  }} 
                />
                <ReferenceArea 
                  y1={referenceRange.min} 
                  y2={referenceRange.max}
                  fill="#10B981"
                  fillOpacity={0.1}
                />
                {/* Below minimum range - red area */}
                <ReferenceArea 
                  y1={yDomain[0]}
                  y2={referenceRange.min}
                  fill="#EF4444"
                  fillOpacity={0.1}
                />
                {/* Above maximum range - red area */}
                <ReferenceArea 
                  y1={referenceRange.max}
                  y2={yDomain[1]}
                  fill="#EF4444"
                  fillOpacity={0.1}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function IndividualBiomarkerTrends({ data }: { data: AnalysisResult[] }) {
  let orderedBiomarkerNames: string[] = [];
  
  if (data.length > 0) {
    // Debug logging
    console.log('Raw biomarkers from reports:', data.map(entry => Object.keys(entry.biomarkers)).flat());
    
    // First collect all valid biomarkers from all reports
    const allBiomarkers = new Set<string>();
    
    data.forEach(entry => {
      Object.keys(entry.biomarkers).forEach(biomarkerName => {
        // Debug logging for validation
        if (!isValidBiomarker(biomarkerName)) {
          console.log('Invalid biomarker:', biomarkerName);
        } else {
          const normalizedName = normalizeBiomarkerName(biomarkerName);
          console.log('Normalized biomarker:', biomarkerName, '->', normalizedName);
          allBiomarkers.add(normalizedName);
        }
      });
    });
    
    // Sort according to PREFERRED_BIOMARKER_ORDER
    orderedBiomarkerNames = Array.from(allBiomarkers).sort((a, b) => {
      const indexA = PREFERRED_BIOMARKER_ORDER.findIndex(name => 
        name.toLowerCase() === a.toLowerCase() || a.toLowerCase().includes(name.toLowerCase())
      );
      const indexB = PREFERRED_BIOMARKER_ORDER.findIndex(name => 
        name.toLowerCase() === b.toLowerCase() || b.toLowerCase().includes(name.toLowerCase())
      );
      
      // If both are in the preferred order list, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the list, it comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the list, maintain alphabetical order
      return a.localeCompare(b);
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#1E293B] mb-6">Individual Biomarker Trends</h2>
      
      {orderedBiomarkerNames.length === 0 ? (
        <div className="text-center py-8 text-[#1E293B]/60">
          <p>No biomarker data available.</p>
          <p className="text-sm mt-2">Upload and analyze more reports to see trends over time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {orderedBiomarkerNames.map(biomarkerName => (
            <BiomarkerChart 
              key={biomarkerName} 
              data={data} 
              biomarkerName={biomarkerName} 
            />
          ))}
        </div>
      )}
    </div>
  );
} 