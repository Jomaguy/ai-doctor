// components/FileUpload.tsx
'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import TrendChart from './TrendChart'
import IndividualBiomarkerTrends from './IndividualBiomarkerTrends'
import BiomarkerRange from './BiomarkerRange'

interface Biomarker {
  value: number | null;
  unit?: string;
  referenceRange?: {
    min: number;
    max: number;
  };
  description?: string;
}

interface AnalysisResult {
  fileName: string;
  biomarkers: Record<string, Biomarker>;
  error?: string;
  testDate: string;
}

interface HistoricalResult {
  date: string;
  biomarkers: Record<string, Biomarker>;
}

export default function FileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [history, setHistory] = useState<HistoricalResult[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [activeTab, setActiveTab] = useState<'biomarkers' | 'trends'>('biomarkers')
  const [activeReportIndex, setActiveReportIndex] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {'application/pdf': ['.pdf']},
    onDrop: (files) => {
      setUploadedFiles(prev => [...prev, ...files])
      setUploadError(null)
    }
  })

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const analyzeFiles = async () => {
    if (uploadedFiles.length === 0) {
      setUploadError('Please upload at least one file')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setResults([])
    
    try {
      const formData = new FormData()
      uploadedFiles.forEach(file => formData.append('reports', file))
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      
      console.log('API Response:', data.results); // Debug the API response
      
      setResults(data.results)
      setActiveReportIndex(0) // Reset to first report when new results come in
      
      // Add new results to history with the test date extracted from the PDF
      const newHistoryEntries = data.results.map((result: AnalysisResult) => {
        console.log('Test date from PDF:', result.testDate); // Debug the test date
        return {
          date: result.testDate, // Use the extracted test date
          biomarkers: result.biomarkers
        };
      });
      
      console.log('New history entries:', newHistoryEntries); // Debug history entries
      
      setHistory(prev => {
        const updated = [...prev, ...newHistoryEntries];
        console.log('Updated history:', updated); // Debug final history
        return updated;
      });
      
      setUploadedFiles([]) // Clear files after successful analysis
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-[95vw] mx-auto">
      <div
        {...getRootProps()}
        className={`
          p-8 border-2 border-dashed rounded-lg transition-all duration-200
          ${isDragActive 
            ? 'border-[#2563EB] bg-[#E0F2FE]' 
            : 'border-[#1E293B]/20 hover:border-[#2563EB] hover:bg-[#E0F2FE]/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <p className="text-lg mb-2 text-[#1E293B]">
            {isDragActive
              ? "Drop your PDF reports here"
              : "Drag & drop PDF blood reports here"}
          </p>
          <p className="text-sm text-[#1E293B]/60">
            or click to select files
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-[#E0F2FE]">
          <h3 className="text-lg font-semibold mb-4 text-[#1E293B]">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E0F2FE]"
              >
                <div className="flex items-center space-x-3">
                  <svg 
                    className="w-6 h-6 text-[#2563EB]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                  <span className="text-sm font-medium text-[#1E293B]">{file.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeFile(index)
                  }}
                  className="text-[#EF4444] hover:text-[#EF4444]/80 transition-colors"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          {/* Analyze Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={analyzeFiles}
              disabled={isUploading}
              className={`
                px-6 py-2 rounded-lg text-white font-medium
                ${isUploading
                  ? 'bg-[#2563EB]/50 cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-[#2563EB]/90 active:bg-[#2563EB]/80'
                }
                transition-colors
              `}
            >
              {isUploading ? 'Analyzing...' : 'Analyze Files'}
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444] text-[#EF4444] p-4 rounded-lg">
          {uploadError}
        </div>
      )}

      {/* Results Section with Tabs */}
      {(results.length > 0 || history.length > 0) && (
        <div className="bg-white rounded-lg shadow-lg border border-[#E0F2FE] overflow-hidden">
          {/* Main Tab Navigation */}
          <div className="flex border-b border-[#E0F2FE]">
            <button
              onClick={() => setActiveTab('biomarkers')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'biomarkers'
                  ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
                  : 'text-[#1E293B]/60 hover:text-[#1E293B]'
              }`}
            >
              Biomarkers
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'trends'
                  ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
                  : 'text-[#1E293B]/60 hover:text-[#1E293B]'
              }`}
            >
              Trends
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 lg:p-8">
            {/* Biomarkers Tab Content */}
            {activeTab === 'biomarkers' && results.length > 0 && (
              <div>
                {/* Report Selection Tabs */}
                {results.length > 1 && (
                  <div className="flex overflow-x-auto mb-6 border-b border-[#E0F2FE] pb-2">
                    {results.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveReportIndex(index)}
                        className={`px-4 py-2 mr-2 rounded-t-lg text-sm font-medium whitespace-nowrap
                          ${activeReportIndex === index
                            ? 'bg-[#E0F2FE] text-[#2563EB]'
                            : 'text-[#1E293B]/60 hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                          }
                          transition-colors
                        `}
                      >
                        {result.fileName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Report Content */}
                {results.length > 0 && (
                  <div>
                    {results[activeReportIndex].error ? (
                      <p className="text-[#EF4444]">{results[activeReportIndex].error}</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Use the original order from the API response */}
                        {Object.keys(results[activeReportIndex].biomarkers).map(name => (
                          <BiomarkerRange
                            key={name}
                            name={name}
                            value={results[activeReportIndex].biomarkers[name].value}
                            unit={results[activeReportIndex].biomarkers[name].unit}
                            referenceRange={results[activeReportIndex].biomarkers[name].referenceRange}
                            description={results[activeReportIndex].biomarkers[name].description}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trends Tab Content */}
            {activeTab === 'trends' && history.length > 1 && (
              <div>
                <IndividualBiomarkerTrends data={history} />
              </div>
            )}

            {activeTab === 'trends' && history.length <= 1 && (
              <div className="text-center py-8 text-[#1E293B]/60">
                <p>Not enough data to display trends.</p>
                <p className="text-sm mt-2">Upload and analyze more reports to see trends over time.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
