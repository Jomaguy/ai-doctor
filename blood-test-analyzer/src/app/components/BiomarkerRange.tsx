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
  description?: string;
}

// List of known valid biomarkers
const VALID_BIOMARKERS = [
  // Blood Cell Counts and Measurements
  'Hemoglobin', 'Hematocrit', 'Mean Cell Hemoglobin', 'Mean Cell Hemoglobin Concentration',
  'Mean Cell Volume', 'Red Blood Cells', 'Basophils', 'Eosinophils', 'Lymphocytes',
  'Monocytes', 'Neutrophils', 'White Blood Cells', 'Platelets',
  
  // Iron Status
  'Ferritin', 'Iron', 'Transferrin', 'TIBC',
  
  // Lipid Panel
  'Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides',
  'Cholesterol', 'LDL', 'HDL',
  
  // Inflammation Markers
  'High Sensitivity C-Reactive Protein', 'hsCRP', 'High Sensitivity C-Reactive Protein (hsCRP)',
  'CRP', 'ESR', 'C-Reactive Protein',
  
  // Glucose Metabolism
  'Glucose', 'HbA1c', 'A1C', 'Insulin', 'Hemoglobin A1c',
  
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
  'Folic acid', 'Folate', 'Folic acid/Folate',
  'Vitamin C', 'Vitamin C deficiency', 'Vitamin C deficiencyRH',
  'Vitamin B12', 'Vitamin D', 'Vitamin D, 25 Hydroxy',
  'Zinc', 'ZincRH', 'Zinc High', 'Zinc Low',
  'Iron', 'Uric Acid',
  
  // Thyroid Function
  'Free Thyroxine', 'FT4', 'Free Thyroxine (FT4)',
  'Free Tri-iodothyronine', 'FT3', 'Free Tri-iodothyronine (FT3)',
  'Thyroid Stimulating Hormone', 'TSH', 'Thyroid Stimulating Hormone (TSH)',
  'T3', 'T4',
  
  // Sex Hormones
  'Sex Hormone Binding Globulin', 'SHBG', 'Sex Hormone Binding Globulin (SHBG)',
  'Testosterone', 'Testosterone, Total', 'Estradiol',
  
  // Additional Biomarkers
  'Immunoglobulin E', 'IgE', 'Immunoglobulin E (IgE)',
  'MCV', 'MCH', 'MCHC', 'RDW',
  
  // Variations with High/Low indicators
  'Mean Cell Hemoglobin Concentration Low',
  'Basophils High',
  'Creatinine High',
  'Potassium High',
  'Albumin High',
  'Zinc High'
];

// Helper function to determine if a biomarker is valid
export const isValidBiomarker = (name: string): boolean => {
  // Normalize name - remove newlines and extra spaces
  const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Standalone words that should not be considered biomarkers
  const standaloneExclusions = [
    'high', 'low', 'normal', 'optimal', 'reference', 'range', 
    'results', 'elevated', 'decreased', 'value', 'test', 'standard',
    'pending', 'final', 'see', 'note', 'positive', 'negative'
  ];
  
  // Reject if it's just a standalone excluded word
  if (standaloneExclusions.includes(normalizedName)) {
    return false;
  }
  
  // Check if it's in our predefined list (case-insensitive)
  const isInList = VALID_BIOMARKERS.some(
    validName => {
      const normalizedValid = validName.toLowerCase().replace(/\s+/g, ' ').trim();
      return normalizedName === normalizedValid || 
             normalizedName.includes(normalizedValid) ||
             normalizedValid.includes(normalizedName);
    }
  );
  
  // Additional checks for non-biomarker patterns
  const nonBiomarkerWords = [
    'com', 'health', 'california', 'ca', 'randox', 'monica', 'santa',
    'center', 'medical', 'clinic', 'laboratories', 'diagnostic', 'inc',
    'ltd', 'llc', 'corporation', 'test', 'report', 'page', 'date'
  ];
  
  // Exclude if it contains non-biomarker words
  if (name.split(/\s+/).some(word => nonBiomarkerWords.includes(word.toLowerCase()))) {
    return false;
  }
  
  return isInList;
};

export default function BiomarkerRange({
  name,
  value,
  unit,
  referenceRange,
  criticalLow = referenceRange ? referenceRange.min * 0.7 : undefined,
  low = referenceRange?.min,
  high = referenceRange?.max,
  criticalHigh = referenceRange ? referenceRange.max * 1.3 : undefined,
  description,
}: BiomarkerRangeProps) {
  // Skip rendering if the biomarker name is not valid
  if (!isValidBiomarker(name)) {
    return null;
  }

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
      
      {/* Description */}
      {description && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-sm text-[#1E293B]/80">{description}</p>
        </div>
      )}
    </div>
  )
} 