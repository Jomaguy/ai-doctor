import FileUpload from "./components/FileUpload";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">
            Blood Test Analyzer
          </h1>
          <p className="text-lg mb-8 text-gray-600">
            Upload your blood test reports in PDF format for instant analysis
          </p>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <FileUpload />
          </div>
        </div>
      </main>
    </div>
  );
}
