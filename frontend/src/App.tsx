import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { QuotaBanner } from './components/QuotaBanner';
import { SejdaToolsGrid, SejdaToolType } from './components/SejdaToolsGrid';
import { DocumentList } from './components/DocumentList';
import { DualPaneWorkspace } from './components/DualPaneWorkspace';
import { UploadModal } from './components/UploadModal';
import { PlanPricingModal } from './components/PlanPricingModal';

// Sejda Tool Modals
import { VisualPdfEditor } from './components/tools/VisualPdfEditor';
import { MergePdfModal } from './components/tools/MergePdfModal';
import { SplitPdfModal } from './components/tools/SplitPdfModal';
import { OrganizePdfModal } from './components/tools/OrganizePdfModal';
import { CompressPdfModal } from './components/tools/CompressPdfModal';
import { SecurityPdfModal } from './components/tools/SecurityPdfModal';
import { WatermarkPageNumbersModal } from './components/tools/WatermarkPageNumbersModal';
import { ImagesToPdfModal } from './components/tools/ImagesToPdfModal';
import { ConvertPdfModal } from './components/tools/ConvertPdfModal';

import { DocumentItem, QuotaStatus, SampleDocument } from './types';
import { api } from './api/client';

export function App() {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<SejdaToolType | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [samples, setSamples] = useState<SampleDocument[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [quotaData, docsData, samplesData] = await Promise.all([
        api.getQuota(),
        api.getDocuments(),
        api.getSamples()
      ]);
      setQuota(quotaData);
      setDocuments(docsData);
      setSamples(samplesData);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshDocumentsAndQuota = async () => {
    try {
      const [quotaData, docsData] = await Promise.all([
        api.getQuota(),
        api.getDocuments()
      ]);
      setQuota(quotaData);
      setDocuments(docsData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDocumentCreated = (docId: string) => {
    refreshDocumentsAndQuota();
    setActiveDocId(docId);
  };

  const handleSelectTool = (tool: SejdaToolType) => {
    setActiveTool(tool);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        quota={quota}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenPricing={() => setShowPricingModal(true)}
        onGoHome={() => {
          setActiveDocId(null);
          setActiveTool(null);
        }}
        onSelectTool={handleSelectTool}
        currentView={activeDocId ? 'workspace' : activeTool ? 'tool' : 'home'}
      />

      <QuotaBanner
        quota={quota}
        onOpenPricing={() => setShowPricingModal(true)}
      />

      <main className="flex-1">
        {activeDocId ? (
          <DualPaneWorkspace
            documentId={activeDocId}
            onBack={() => {
              setActiveDocId(null);
              refreshDocumentsAndQuota();
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Sejda All Tools Categorized Matrix */}
            <SejdaToolsGrid
              onSelectTool={handleSelectTool}
              onOpenDocuMindScanner={() => setShowUploadModal(true)}
            />

            {/* Document Intelligence Library */}
            <DocumentList
              documents={documents}
              samples={samples}
              onOpenDocument={(id) => setActiveDocId(id)}
              onOpenUpload={() => setShowUploadModal(true)}
              onRefresh={refreshDocumentsAndQuota}
            />
          </div>
        )}
      </main>

      {/* --- SEJDA TOOL WORKSPACES & MODALS --- */}

      {/* 1. Visual PDF Editor & Signer */}
      {activeTool === 'editor' && (
        <VisualPdfEditor onClose={() => setActiveTool(null)} />
      )}

      {/* 2. Merge PDF */}
      <MergePdfModal
        isOpen={activeTool === 'merge'}
        onClose={() => setActiveTool(null)}
      />

      {/* 3. Split & Extract PDF */}
      <SplitPdfModal
        isOpen={activeTool === 'split'}
        onClose={() => setActiveTool(null)}
      />

      {/* 4. Organize, Delete & Rotate */}
      <OrganizePdfModal
        isOpen={activeTool === 'organize' || activeTool === 'rotate' || activeTool === 'delete'}
        onClose={() => setActiveTool(null)}
      />

      {/* 5. Compress PDF */}
      <CompressPdfModal
        isOpen={activeTool === 'compress'}
        onClose={() => setActiveTool(null)}
      />

      {/* 6. Security (Protect & Unlock) */}
      <SecurityPdfModal
        isOpen={activeTool === 'protect' || activeTool === 'unlock'}
        initialMode={activeTool === 'unlock' ? 'unlock' : 'protect'}
        onClose={() => setActiveTool(null)}
      />

      {/* 7. Watermark & Page Numbers */}
      <WatermarkPageNumbersModal
        isOpen={activeTool === 'watermark' || activeTool === 'page_numbers'}
        initialTab={activeTool === 'page_numbers' ? 'page_numbers' : 'watermark'}
        onClose={() => setActiveTool(null)}
      />

      {/* 8. Images to PDF */}
      <ImagesToPdfModal
        isOpen={activeTool === 'images_to_pdf'}
        onClose={() => setActiveTool(null)}
      />

      {/* 9. Convert PDF (to Word, Excel, Text) */}
      <ConvertPdfModal
        isOpen={activeTool === 'pdf_to_word' || activeTool === 'pdf_to_excel' || activeTool === 'pdf_to_text'}
        targetFormat={activeTool === 'pdf_to_excel' ? 'xlsx' : activeTool === 'pdf_to_text' ? 'txt' : 'docx'}
        onClose={() => setActiveTool(null)}
      />

      {/* Global Ingestion & Pricing Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        quota={quota}
        onDocumentCreated={handleDocumentCreated}
      />

      <PlanPricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentQuota={quota}
        onPlanChanged={(newQuota) => {
          setQuota(newQuota);
          refreshDocumentsAndQuota();
        }}
      />
    </div>
  );
}

export default App;
