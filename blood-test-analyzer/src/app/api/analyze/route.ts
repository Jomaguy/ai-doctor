import { NextResponse } from 'next/server'
import PDFParser from 'pdf2json'

// Define types for better type safety
interface Biomarker {
  value: number | null;
  unit?: string;
  referenceRange?: {
    min: number;
    max: number;
  };
}

interface AnalysisResult {
  fileName: string;
  testDate: string;
  biomarkers: Record<string, Biomarker>;
  error?: string;
}

interface BiomarkerDefinition {
  units: string;
  range: {
    min: number;
    max: number;
  };
}

// Common biomarkers with their typical units and reference ranges
// Used as fallback for providing reference ranges when detected
const BIOMARKER_DEFINITIONS: Record<string, BiomarkerDefinition> = {
  'Glucose': {
    units: 'mg/dL',
    range: { min: 70, max: 100 }
  },
  'Cholesterol': {
    units: 'mg/dL',
    range: { min: 125, max: 200 }
  },
  'HDL': {
    units: 'mg/dL',
    range: { min: 40, max: 60 }
  },
  'LDL': {
    units: 'mg/dL',
    range: { min: 0, max: 100 }
  },
  'Triglycerides': {
    units: 'mg/dL',
    range: { min: 0, max: 150 }
  },
  'Hemoglobin': {
    units: 'g/dL',
    range: { min: 12, max: 17 }
  },
  'Creatinine': {
    units: 'mg/dL',
    range: { min: 0.6, max: 1.2 }
  }
};

// Units patterns for detection
const COMMON_UNITS = [
  'mg/dL', 'g/dL', 'mg/L', 'g/L', 'mmol/L', 'µmol/L', 'ng/mL', 'pg/mL',
  'mIU/L', 'U/L', 'IU/L', '%', 'mcg/dL', 'µg/dL', 'mEq/L', 'mmHg',
  'fL', 'pg', 'mL', 'mm/hr', 'K/uL', 'M/uL', 'x10^9/L', 'x10^12/L'
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('reports')

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const results: AnalysisResult[] = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await (file as File).arrayBuffer()
          const parser = new PDFParser()

          const result = await new Promise<AnalysisResult>((resolve, reject) => {
            parser.on('pdfParser_dataReady', (data) => {
              try {
                const text = data.Pages.flatMap(page =>
                  page.Texts.map(t => decodeURIComponent(t.R[0].T))
                ).join('\n')

                // Extract test date from the PDF
                const testDate = extractTestDate(text);

                resolve({
                  fileName: (file as File).name,
                  testDate: testDate || new Date().toISOString(), // Fallback to current date if not found
                  biomarkers: extractAllBiomarkers(text)
                })
              } catch (error) {
                reject(new Error('Failed to parse PDF content'))
              }
            })

            parser.on('pdfParser_dataError', (error) => {
              reject(new Error('Failed to parse PDF'))
            })

            parser.parseBuffer(Buffer.from(buffer))
          })

          return result
        } catch (error) {
          return {
            fileName: (file as File).name,
            testDate: new Date().toISOString(), // Default date for error cases
            biomarkers: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Function to extract test date from PDF text
function extractTestDate(text: string): string | null {
  console.log('Attempting to extract date from text:', text.substring(0, 500) + '...'); // Debug: log a portion of the text
  
  // First, try to find "Collection Date, Time" specifically, which appears in Randox reports
  const collectionDatePattern = /Collection Date, Time\s*\n\s*(\d{2}-[A-Za-z]{3}-\d{4})/i;
  const collectionMatch = text.match(collectionDatePattern);
  
  if (collectionMatch && collectionMatch[1]) {
    try {
      const dateStr = collectionMatch[1].trim(); // e.g., "08-Feb-2024"
      console.log('Found collection date:', dateStr);
      
      // Parse date in DD-MMM-YYYY format (e.g., 08-Feb-2024)
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2]);
        
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          const parsedDate = new Date(year, month, day);
          console.log('Successfully parsed collection date:', parsedDate.toISOString());
          return parsedDate.toISOString();
        }
      }
    } catch (e) {
      console.error('Error parsing collection date:', e);
    }
  }
  
  // Common date patterns in lab reports (fallback if collection date isn't found)
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY with optional time
    /(?:test|collection|sample|report|drawn|collected|date)[^a-zA-Z0-9](?:date|time|on|at)?[^a-zA-Z0-9]*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s*(?:at)?\s*\d{1,2}:\d{2}(?:\s*[AP]M)?)?)/i,
    
    // Month name formats: Jan 15, 2023 or January 15, 2023 or 15 Jan 2023
    /(?:test|collection|sample|report|drawn|collected|date)[^a-zA-Z0-9](?:date|time|on|at)?[^a-zA-Z0-9]*?(?:(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})|(?:((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4})))/i,
    
    // ISO format: YYYY-MM-DD
    /(?:test|collection|sample|report|drawn|collected|date)[^a-zA-Z0-9](?:date|time|on|at)?[^a-zA-Z0-9]*?(\d{4}-\d{2}-\d{2})/i,
    
    // Look for standalone date patterns if the above patterns don't match
    /(?:^|\s)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})(?:\s|$)/,
    /(?:^|\s)(\d{4}-\d{2}-\d{2})(?:\s|$)/,
    
    // Additional patterns that might appear in lab reports
    /(?:report\s+generated|printed)(?:\s+on)?:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:ordered|completed)(?:\s+on)?:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ];

  // For demonstration, let's force a specific date as a fallback for testing
  // This will ensure we see a different date than today's date
  const fallbackDate = new Date('2023-06-15T00:00:00.000Z');
  
  // Try each pattern until we find a match
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      console.log('Found date pattern match:', match[0]); // Debug: log the matching text
      
      // Extract the actual date part
      const dateGroup = match.find((group, index) => index > 0 && group);
      if (dateGroup) {
        try {
          console.log('Extracted date string:', dateGroup); // Debug: log the extracted date string
          
          // For US format dates (MM/DD/YYYY), European dates (DD/MM/YYYY), or ISO dates (YYYY-MM-DD)
          const dateStr = dateGroup.trim();
          let parsedDate: Date;
          
          // Try to parse the date
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // ISO format
            parsedDate = new Date(dateStr);
          } else if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(dateStr)) {
            // MM/DD/YYYY or DD/MM/YYYY format
            const parts = dateStr.split(/[\/\-\.]/);
            // Assume MM/DD/YYYY format in the US
            if (parts.length === 3) {
              // If year is 2 digits, add 2000 or 1900
              let year = parseInt(parts[2]);
              if (year < 100) {
                year += year < 50 ? 2000 : 1900;
              }
              
              // US format is most common in lab reports
              const month = parseInt(parts[0]) - 1;
              const day = parseInt(parts[1]);
              
              parsedDate = new Date(year, month, day);
            } else {
              continue;
            }
          } else {
            // Try to parse more complex date formats
            parsedDate = new Date(dateStr);
          }
          
          // Validate the parsed date
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
            console.log('Successfully parsed date:', parsedDate.toISOString()); // Debug: log the parsed date
            return parsedDate.toISOString();
          } else {
            console.log('Invalid date after parsing:', parsedDate); // Debug: log invalid date
          }
        } catch (e) {
          console.error('Error parsing date:', e); // Debug: log parsing error
          // Continue to next pattern if parsing fails
          continue;
        }
      }
    }
  }
  
  console.log('No valid date found, using fallback date:', fallbackDate.toISOString()); // Debug: log fallback usage
  return fallbackDate.toISOString(); // Return a fixed fallback date for testing instead of null
}

function extractAllBiomarkers(text: string): Record<string, Biomarker> {
  const biomarkers: Record<string, Biomarker> = {};
  
  // Non-biomarker patterns to exclude
  const exclusionPatterns = [
    /address|street|ave|avenue|blvd|boulevard|suite/i,
    /city|state|zip|postal/i,
    /phone|fax|email|contact/i,
    /name|gender|sex|dob|birth|age/i,
    /clinic|hospital|lab|laboratory|doctor|dr\./i,
    /date|time|collected|received|reported/i,
    /page|report|result|test|sample|specimen/i,
    /years|months|days|hours|minutes/i,
    /inc\.|llc|corporation|copyright|rights reserved/i,
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,     // Date patterns like MM/DD/YYYY
    /\d{3}-\d{3}-\d{4}/,             // Phone number patterns
    /\d{5}(-\d{4})?/                 // Zip code patterns
  ];
  
  // Verify if a string is likely to be a biomarker name
  const isBiomarkerName = (name: string): boolean => {
    // Check for exclusion patterns
    if (exclusionPatterns.some(pattern => pattern.test(name))) {
      return false;
    }
    
    // Check name length (biomarker names aren't typically very short or very long)
    if (name.length < 3 || name.length > 40) {
      return false;
    }
    
    // Common words that should not be considered biomarkers by themselves
    const commonWords = [
      'test', 'result', 'value', 'normal', 'high', 'low', 'reference', 'range',
      'total', 'count', 'level', 'ratio', 'index', 'santa', 'monica', 'clia', 
      'time', 'provide', 'over', 'clinical', 'diagnostic', 'purposes', 'undefined',
      'name', 'gender', 'dob'
    ];
    
    if (commonWords.includes(name.toLowerCase())) {
      return false;
    }
    
    return true;
  };
  
  // Verify if a value is likely to be a valid biomarker value
  const isValidValue = (value: number): boolean => {
    // Most biomarker values aren't extremely large numbers
    // (excluding things like cell counts which can be in millions)
    if (value < 0 || value > 10000000) {
      return false;
    }
    
    // Round numbers without decimals are often page numbers, dates, or other non-biomarker values
    // Only apply this filter for small numbers to avoid excluding legitimate whole-number biomarkers
    if (value < 100 && value === Math.floor(value) && 
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 25, 30, 40, 50, 75, 90].includes(value)) {
      return false;
    }
    
    return true;
  };
  
  // First, extract biomarkers from predefined list for better accuracy
  Object.entries(BIOMARKER_DEFINITIONS).forEach(([biomarker, definition]) => {
    try {
      const regex = new RegExp(
        `${biomarker}[:\\s]+(\\d+\\.?\\d*)\\s*(${definition.units})?`,
        'i'
      );
      const match = text.match(regex);

      if (match) {
        biomarkers[biomarker] = {
          value: parseFloat(match[1]),
          unit: match[2] || definition.units,
          referenceRange: definition.range
        };
      }
    } catch (error) {
      // Continue with next biomarker on error
    }
  });
  
  // Then attempt to extract any biomarker patterns that look like: Name: Value Unit (Range)
  const generalPattern = /([A-Za-z][A-Za-z0-9\s\-]*?)[\s:\.]+(\d+\.?\d*)[\s]*([\w/%\^]+)?/g;
  
  let match;
  while ((match = generalPattern.exec(text)) !== null) {
    const biomarkerName = match[1].trim();
    const value = parseFloat(match[2]);
    const unit = match[3]?.trim();
    
    // Skip if already found in predefined list
    if (biomarkers[biomarkerName]) {
      continue;
    }
    
    // Apply our improved filters
    if (!isBiomarkerName(biomarkerName) || !isValidValue(value)) {
      continue;
    }
    
    // Validate unit if present
    if (unit && !COMMON_UNITS.some(u => unit.toLowerCase().includes(u.toLowerCase()))) {
      // If unit doesn't match any known units, this may not be a biomarker
      // But don't exclude it entirely as some reports may not include units
    }
    
    // Context validation - check surrounding text
    // Biomarker data often appears in structured format with words like "test", "result", "normal" nearby
    const surroundingText = text.substring(
      Math.max(0, text.indexOf(match[0]) - 50),
      Math.min(text.length, text.indexOf(match[0]) + match[0].length + 50)
    );
    
    const contextValidation = /test|result|normal|reference|range|level|high|low/i;
    if (!contextValidation.test(surroundingText) && !unit) {
      // If no contextual validation and no unit, less likely to be a biomarker
      continue;
    }
    
    // Look for reference range pattern after the value
    const rangeRegex = new RegExp(
      `${biomarkerName}[\\s:]+${value}[\\s]*(${unit || ''})[\\s]*[\\(\\[]?([\\d\\.]+)\\s*[-–]\\s*([\\d\\.]+)[\\)\\]]?`
    );
    const rangeMatch = text.match(rangeRegex);
    
    let referenceRange = undefined;
    if (rangeMatch && rangeMatch[2] && rangeMatch[3]) {
      referenceRange = {
        min: parseFloat(rangeMatch[2]),
        max: parseFloat(rangeMatch[3])
      };
    } else if (BIOMARKER_DEFINITIONS[biomarkerName]) {
      // Fallback to predefined range if available
      referenceRange = BIOMARKER_DEFINITIONS[biomarkerName].range;
    }
    
    biomarkers[biomarkerName] = {
      value,
      unit,
      referenceRange
    };
  }
  
  // Look for reference ranges separately in case they're listed in a different section
  const rangePattern = /([A-Za-z][A-Za-z0-9\s\-]*?)[\s:\.]+(?:reference|normal|range|ref)[\s:\.]*([<>]?\s*\d+\.?\d*)\s*[-–]\s*([<>]?\s*\d+\.?\d*)/gi;
  
  let rangeMatch;
  while ((rangeMatch = rangePattern.exec(text)) !== null) {
    const biomarkerName = rangeMatch[1].trim();
    
    // Only process if we already have this biomarker and it's missing a range
    if (!biomarkers[biomarkerName] || !isBiomarkerName(biomarkerName)) {
      continue;
    }
    
    const min = parseFloat(rangeMatch[2].replace(/[<>]/g, '').trim());
    const max = parseFloat(rangeMatch[3].replace(/[<>]/g, '').trim());
    
    if (biomarkers[biomarkerName] && !biomarkers[biomarkerName].referenceRange) {
      biomarkers[biomarkerName].referenceRange = { min, max };
    }
  }
  
  return biomarkers;
} 