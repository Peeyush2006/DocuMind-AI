import React, { useState } from 'react';
import {
  FileText,
  Minimize2,
  GitMerge,
  Scissors,
  RotateCw,
  Trash2,
  Lock,
  Unlock,
  Stamp,
  Hash,
  PenTool,
  Image,
  FileSpreadsheet,
  FileDown,
  Sparkles,
  Search,
  ChevronRight,
  ChevronDown,
  Crop,
  FileSignature,
  Layers,
  ArrowRight,
  Star,
  Monitor,
  Globe,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Shield,
  FileCheck,
  Split,
  Eye,
  Shuffle,
  Bookmark,
  Columns,
  Grid,
  Edit,
  Type,
  Presentation,
  Check
} from 'lucide-react';

export type SejdaToolType =
  | 'editor'
  | 'merge'
  | 'split'
  | 'compress'
  | 'organize'
  | 'rotate'
  | 'delete'
  | 'protect'
  | 'unlock'
  | 'watermark'
  | 'page_numbers'
  | 'images_to_pdf'
  | 'pdf_to_word'
  | 'pdf_to_excel'
  | 'pdf_to_text'
  | 'ai_scanner';

interface SejdaToolsGridProps {
  onSelectTool: (tool: SejdaToolType) => void;
  onOpenDocuMindScanner: () => void;
}

export const SejdaToolsGrid: React.FC<SejdaToolsGridProps> = ({
  onSelectTool,
  onOpenDocuMindScanner
}) => {
  const [activeGuideTab, setActiveGuideTab] = useState<'edit' | 'word' | 'merge' | 'jpg' | 'delete' | 'compress' | 'type'>('edit');
  const [search, setSearch] = useState('');

  // 1. Most Popular (Page 1 & 2 of PDF)
  const popularTools = [
    {
      id: 'editor' as SejdaToolType,
      name: 'PDF Editor',
      desc: 'Edit PDF files for free. Fill & sign PDF. Add text, links, images and shapes. Edit existing PDF text. Annotate PDF',
      icon: PenTool,
      iconBg: 'bg-[#e0f2fe]',
      iconColor: 'text-[#0284c7]'
    },
    {
      id: 'compress' as SejdaToolType,
      name: 'Compress',
      desc: 'Reduce the size of your PDF',
      icon: Minimize2,
      iconBg: 'bg-[#ccfbf1]',
      iconColor: 'text-[#0d9488]'
    },
    {
      id: 'delete' as SejdaToolType,
      name: 'Delete Pages',
      desc: 'Remove pages from a PDF document',
      icon: Trash2,
      iconBg: 'bg-[#e0f2fe]',
      iconColor: 'text-[#0284c7]'
    },
    {
      id: 'merge' as SejdaToolType,
      name: 'Merge',
      desc: 'Combine multiple PDFs and images into one',
      icon: GitMerge,
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]'
    },
    {
      id: 'split' as SejdaToolType,
      name: 'Split',
      desc: 'Split specific page ranges or extract every page into a separate document',
      icon: Scissors,
      iconBg: 'bg-[#ecfccb]',
      iconColor: 'text-[#65a30d]'
    },
    {
      id: 'organize' as SejdaToolType,
      name: 'Crop',
      desc: 'Trim PDF margins, change PDF page size',
      icon: Crop,
      iconBg: 'bg-[#fce7f3]',
      iconColor: 'text-[#db2777]'
    },
    {
      id: 'editor' as SejdaToolType,
      name: 'Fill & Sign',
      desc: 'Add signature to PDF. Fill out PDF forms',
      icon: FileSignature,
      iconBg: 'bg-[#cffafe]',
      iconColor: 'text-[#0891b2]'
    },
    {
      id: 'pdf_to_word' as SejdaToolType,
      name: 'PDF To Word',
      desc: 'Convert from PDF to DOC online',
      icon: FileText,
      iconBg: 'bg-[#ffedd5]',
      iconColor: 'text-[#ea580c]'
    },
    {
      id: 'split' as SejdaToolType,
      name: 'Extract Pages',
      desc: 'Get a new document containing only the desired pages',
      icon: Layers,
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]'
    }
  ];

  // 2. All Categories (Pages 2-6 of PDF)
  const categorizedSections = [
    {
      title: 'MERGE',
      tools: [
        { id: 'merge' as SejdaToolType, name: 'Alternate & Mix', desc: 'Mixes pages from 2 or more documents, alternating between them', icon: Shuffle },
        { id: 'merge' as SejdaToolType, name: 'Merge', desc: 'Combine multiple PDFs and images into one', icon: GitMerge },
        { id: 'organize' as SejdaToolType, name: 'Organize', desc: 'Arrange and reorder PDF pages visually', icon: Layers }
      ]
    },
    {
      title: 'SPLIT',
      tools: [
        { id: 'split' as SejdaToolType, name: 'Extract Pages', desc: 'Get a new document containing only the desired pages', icon: Layers },
        { id: 'split' as SejdaToolType, name: 'Split By Pages', desc: 'Split specific page ranges or extract every page into a separate document', icon: Scissors },
        { id: 'split' as SejdaToolType, name: 'Split By Bookmarks', desc: 'Extract chapters to separate documents based on bookmarks', icon: Bookmark },
        { id: 'split' as SejdaToolType, name: 'Split In Half', desc: 'Split two page layout scans, A3 to double A4 or A4 to double A5', icon: Columns },
        { id: 'split' as SejdaToolType, name: 'Split By Size', desc: 'Get multiple smaller documents with specific file sizes', icon: Minimize2 },
        { id: 'split' as SejdaToolType, name: 'Split By Text', desc: 'Extract separate documents when specific text changes from page to page', icon: FileText }
      ]
    },
    {
      title: 'EDIT & SIGN',
      tools: [
        { id: 'editor' as SejdaToolType, name: 'PDF Editor', desc: 'Edit PDF files for free. Fill & sign PDF. Add text, links, images and shapes', icon: PenTool },
        { id: 'editor' as SejdaToolType, name: 'Fill & Sign', desc: 'Add signature to PDF. Fill out PDF forms', icon: FileSignature },
        { id: 'editor' as SejdaToolType, name: 'Create Forms', desc: 'Free PDF forms creator. Make existing PDF documents fillable', icon: Edit },
        { id: 'delete' as SejdaToolType, name: 'Delete Pages', desc: 'Remove pages from a PDF document', icon: Trash2 }
      ]
    },
    {
      title: 'COMPRESS & SCANS',
      tools: [
        { id: 'compress' as SejdaToolType, name: 'Compress', desc: 'Reduce the size of your PDF while maintaining quality', icon: Minimize2 },
        { id: 'ai_scanner' as SejdaToolType, name: 'Deskew', desc: 'Automatically straighten and deskew scanned PDF pages', icon: RotateCw },
        { id: 'ai_scanner' as SejdaToolType, name: 'OCR', desc: 'Convert PDF scans to searchable text and PDFs. Extract text from scans', icon: Sparkles }
      ]
    },
    {
      title: 'SECURITY',
      tools: [
        { id: 'protect' as SejdaToolType, name: 'Protect', desc: 'Protect file with password and permissions', icon: Lock },
        { id: 'unlock' as SejdaToolType, name: 'Unlock', desc: 'Remove restrictions and password from PDF files', icon: Unlock },
        { id: 'watermark' as SejdaToolType, name: 'Watermark', desc: 'Add image or text watermark to PDF documents', icon: Stamp },
        { id: 'protect' as SejdaToolType, name: 'Flatten', desc: 'Makes fillable PDFs read-only. Print & scan in one step', icon: FileCheck }
      ]
    },
    {
      title: 'CONVERT FROM PDF',
      tools: [
        { id: 'pdf_to_excel' as SejdaToolType, name: 'PDF To Excel', desc: 'Convert PDF to Excel or CSV online for free. Extract table data', icon: FileSpreadsheet },
        { id: 'images_to_pdf' as SejdaToolType, name: 'PDF To JPG', desc: 'Get PDF pages converted to JPG, PNG or TIFF images', icon: Image },
        { id: 'pdf_to_word' as SejdaToolType, name: 'PDF To PPT', desc: 'Convert PDF to PowerPoint presentation online', icon: Presentation },
        { id: 'pdf_to_text' as SejdaToolType, name: 'PDF To Text', desc: 'Copies all text from the PDF document and extracts it to text file', icon: FileDown },
        { id: 'pdf_to_word' as SejdaToolType, name: 'PDF To Word', desc: 'Convert from PDF to editable DOC online', icon: FileText }
      ]
    },
    {
      title: 'CONVERT TO PDF',
      tools: [
        { id: 'pdf_to_word' as SejdaToolType, name: 'HTML To PDF', desc: 'Convert web pages or HTML files to PDF documents', icon: Globe },
        { id: 'images_to_pdf' as SejdaToolType, name: 'JPG To PDF', desc: 'Convert images to PDF document', icon: Image },
        { id: 'pdf_to_word' as SejdaToolType, name: 'Word To PDF', desc: 'Creates a PDF document from Microsoft Word .docx', icon: FileText }
      ]
    },
    {
      title: 'OTHERS',
      tools: [
        { id: 'page_numbers' as SejdaToolType, name: 'Bates Numbering', desc: 'Bates stamp multiple files at once', icon: Hash },
        { id: 'organize' as SejdaToolType, name: 'Create Bookmarks', desc: 'Create PDF Bookmarks', icon: Bookmark },
        { id: 'organize' as SejdaToolType, name: 'Crop', desc: 'Trim PDF margins, change PDF page size', icon: Crop },
        { id: 'editor' as SejdaToolType, name: 'Edit Metadata', desc: 'Change PDF Author, Title, Keywords, Subject and other metadata fields', icon: Edit },
        { id: 'split' as SejdaToolType, name: 'Extract Images', desc: 'Extract all embedded images from PDF', icon: Image },
        { id: 'rotate' as SejdaToolType, name: 'Flip', desc: 'Mirror pages horizontally or vertically', icon: Shuffle },
        { id: 'compress' as SejdaToolType, name: 'Grayscale', desc: 'Make a PDF text and images grayscale', icon: Eye },
        { id: 'page_numbers' as SejdaToolType, name: 'Header & Footer', desc: 'Apply page numbers or text labels to PDF files', icon: Hash },
        { id: 'organize' as SejdaToolType, name: 'N-Up', desc: 'Print multiple pages per sheet per paper. 2-up or 4-up', icon: Grid },
        { id: 'page_numbers' as SejdaToolType, name: 'Page Numbers', desc: 'Add customizable PDF page numbers', icon: Hash },
        { id: 'editor' as SejdaToolType, name: 'Rename', desc: 'Change document filename based on text from PDF pages', icon: Type },
        { id: 'compress' as SejdaToolType, name: 'Repair', desc: 'Recover data from a corrupted or damaged PDF document', icon: Shield },
        { id: 'organize' as SejdaToolType, name: 'Resize', desc: 'Add page margins and padding, Change PDF page size', icon: Crop },
        { id: 'rotate' as SejdaToolType, name: 'Rotate', desc: 'Rotate and save PDF pages permanently', icon: RotateCw },
        { id: 'delete' as SejdaToolType, name: 'Remove Annotations', desc: 'Batch remove highlights, strikeouts or annotations', icon: Trash2 }
      ]
    }
  ];

  return (
    <div className="relative w-full overflow-hidden font-sans">
      {/* 1. TOP WHITE HERO SECTION WITH TEAL DOT ARCHES */}
      <div className="relative bg-white pt-12 pb-10 sm:pt-16 sm:pb-14 px-4 sm:px-6">
        {/* Left Decorative Teal Dot Pattern */}
        <svg
          className="absolute left-0 top-6 w-32 sm:w-44 h-80 pointer-events-none opacity-50 hidden md:block select-none"
          viewBox="0 0 160 320"
          fill="none"
        >
          <defs>
            <pattern id="dotPatternLeft" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="9" cy="9" r="1.7" fill="#14b8a6" />
            </pattern>
          </defs>
          <path d="M0,0 Q160,160 0,320 Z" fill="url(#dotPatternLeft)" />
        </svg>

        {/* Right Decorative Teal Dot Pattern */}
        <svg
          className="absolute right-0 top-6 w-32 sm:w-44 h-80 pointer-events-none opacity-50 hidden md:block select-none"
          viewBox="0 0 160 320"
          fill="none"
        >
          <defs>
            <pattern id="dotPatternRight" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="9" cy="9" r="1.7" fill="#14b8a6" />
            </pattern>
          </defs>
          <path d="M160,0 Q0,160 160,320 Z" fill="url(#dotPatternRight)" />
        </svg>

        {/* Center Hero Content */}
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            We help with your PDF tasks
          </h1>
          <p className="mt-3 text-lg sm:text-xl font-medium text-[#00a651]">
            Easy, pleasant and productive PDF editor
          </p>

          {/* Primary Action Button */}
          <div className="mt-7 flex flex-col items-center gap-2.5">
            <button
              onClick={() => onSelectTool('editor')}
              className="inline-flex items-center gap-2 rounded-md bg-[#00a651] hover:bg-[#008f45] px-8 py-3.5 text-base font-bold text-white shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <span>Edit a PDF document - it's free</span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <a
              href="#all-tools-grid"
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer pt-1"
            >
              <span>or choose one of our 30+ PDF tools</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. ORGANIC UNDULATING WAVE DIVIDER */}
      <div className="w-full overflow-hidden leading-none -mb-1 select-none pointer-events-none">
        <svg
          className="w-full h-12 sm:h-20 block"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,50 C320,95 500,20 820,60 C1140,100 1300,30 1440,55 L1440,100 L0,100 Z"
            fill="#f4ece1"
            opacity="0.7"
          />
          <path
            d="M0,35 C240,80 480,15 760,50 C1040,85 1260,20 1440,45 L1440,100 L0,100 Z"
            fill="#f8f4ed"
          />
        </svg>
      </div>

      {/* 3. WARM LIGHT SAND SECTION WITH MOST POPULAR CARDS */}
      <div id="all-tools-grid" className="bg-[#f8f4ed] pb-20 pt-2 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Most Popular Label */}
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
              MOST POPULAR
            </h2>
          </div>

          {/* 3x3 Most Popular Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularTools.map((t, idx) => {
              const Icon = t.icon;
              return (
                <div
                  key={`${t.name}_${idx}`}
                  onClick={() => onSelectTool(t.id)}
                  className="group bg-white rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(180,140,100,0.07)] hover:shadow-[0_10px_28px_rgba(180,140,100,0.14)] hover:-translate-y-1 transition-all duration-200 cursor-pointer border border-white/80 flex flex-col justify-start"
                >
                  <div className="flex items-center gap-3.5 mb-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.iconBg} ${t.iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-[#00a651] transition-colors">
                      {t.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {t.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 4. CATEGORIZED TOOL SUITE (Pages 2-6 of PDF) */}
          <div className="mt-16 space-y-12">
            {categorizedSections.map((sec) => (
              <div key={sec.title}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">
                  {sec.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {sec.tools.map((tool, tIdx) => {
                    const ToolIcon = tool.icon;
                    return (
                      <div
                        key={`${tool.name}_${tIdx}`}
                        onClick={() => {
                          if (tool.id === 'ai_scanner') {
                            onOpenDocuMindScanner();
                          } else {
                            onSelectTool(tool.id);
                          }
                        }}
                        className="group bg-white rounded-xl p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-slate-200/80 flex items-start gap-3.5"
                      >
                        <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 group-hover:bg-[#dcfce7] group-hover:text-[#00a651] flex items-center justify-center shrink-0 transition-colors">
                          <ToolIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#00a651] transition-colors">
                            {tool.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {tool.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 5. GOOGLE REVIEWS & SOCIAL PROOF (Page 6 of PDF) */}
          <div className="mt-24 pt-12 text-center border-t border-slate-200/80 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-amber-500 mb-2">
              <span className="text-2xl font-black text-slate-900 mr-1.5">4.5</span>
              {[...Array(4)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
              <Star className="h-5 w-5 fill-amber-400/50 text-amber-400" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              1,874 Google reviews
            </p>
            <h3 className="mt-6 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Works the way you work
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Online or offline — in the cloud or as a desktop application
            </p>
          </div>

          {/* 6. DUAL PLATFORM: WEB & DESKTOP (Page 7 of PDF) */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Sejda Web */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between text-center">
              <div>
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Globe className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">DocuMind Web</h4>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Works in the browser. Our servers process the files for you. Files stay secure. After processing, they are permanently deleted.
                </p>
              </div>
              <button
                onClick={() => onSelectTool('editor')}
                className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#00a651] hover:underline"
              >
                <span>Get started — it's free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Sejda Desktop */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between text-center">
              <div>
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-[#00a651] flex items-center justify-center mb-3">
                  <Monitor className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">DocuMind Desktop</h4>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Works offline. Same features as the online service, and the files never leave your computer. Compatible with MacOS, Windows and Linux.
                </p>
              </div>
              <button
                onClick={() => alert('DocuMind Desktop application package is available on our releases page.')}
                className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
              >
                <span>Download now — it's free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 7. HOW-TO PDF GUIDES SECTION (Pages 7-13 of PDF) */}
          <div className="mt-24 pt-12 border-t border-slate-200/80">
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How-To PDF Guides
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Step-by-step instructions for editing, converting, combining, and securing documents
              </p>
            </div>

            {/* Guide category selector pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {[
                { id: 'edit', label: 'How to edit PDF' },
                { id: 'word', label: 'How to convert to Word' },
                { id: 'merge', label: 'How to combine PDFs' },
                { id: 'jpg', label: 'How to convert to JPG' },
                { id: 'delete', label: 'How to delete pages' },
                { id: 'compress', label: 'How to compress PDF' },
                { id: 'type', label: 'How to type on PDF' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGuideTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeGuideTab === tab.id
                      ? 'bg-[#00a651] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Guide Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 max-w-3xl mx-auto">
              {activeGuideTab === 'edit' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to edit PDF files</h4>
                  <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal pl-5 leading-relaxed">
                    <li>Open a file in the Online PDF editor</li>
                    <li>Click on the Text tool in the top menu</li>
                    <li>Add text on the PDF page. Change text by clicking on existing text to start editing</li>
                    <li>Add images to the page. Click and drag to move, resize or rotate the image</li>
                    <li>Fill out PDF forms and add signatures. Draw, type or upload an image of your signature</li>
                    <li>Annotate PDF pages, highlight text and mark changes with strikethrough</li>
                    <li>Add new links to web URLs or pages in the document. Easily edit existing hyperlinks</li>
                    <li>Easily find and replace all occurrences of words in a PDF. Whiteout parts of the page. Add shapes</li>
                    <li>Click Apply changes and download an edited document</li>
                  </ol>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('editor')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>Edit PDF files</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeGuideTab === 'word' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to convert a PDF to Word</h4>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
                    <li>Open your document with the PDF to Word converter</li>
                    <li>Click Convert and download a Word document with tables and formatting preserved</li>
                  </ul>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('pdf_to_word')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>PDF to DOC converter</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeGuideTab === 'merge' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to combine PDF files</h4>
                  <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal pl-5 leading-relaxed">
                    <li>Open the Merge PDF files tool</li>
                    <li>Drag to reorder the files, or sort them alphabetically</li>
                    <li>Optionally select only a collection of pages to pick from each file</li>
                    <li>Select your documents, or just drag and drop them all to the page</li>
                    <li>Generate bookmarks or an outline based on the inputs</li>
                    <li>Add file names to the footer of each page</li>
                    <li>Generate a nice table of contents based on the documents being merged</li>
                    <li>Optionally specify a cover / title page(s)</li>
                    <li>Merge Acroforms or flatten form fields</li>
                  </ol>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('merge')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>Merge PDF files</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeGuideTab === 'jpg' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to convert PDF to JPG</h4>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
                    <li>Open your PDF with the PDF to JPG, PNG and TIFF converter</li>
                    <li>Convert all pages or select only pages you want converted</li>
                    <li>Select desired image format, PNG, TIFF or JPG</li>
                    <li>Choose a higher resolution, 150 or 220 DPI</li>
                    <li>Quickly convert a PDF page to PNG or JPG</li>
                    <li>Download an archive with all the converted images</li>
                  </ul>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('images_to_pdf')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>PDF to image converter</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeGuideTab === 'delete' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to delete pages from PDF</h4>
                  <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal pl-5 leading-relaxed">
                    <li>Open the file with the Delete PDF Pages tool</li>
                    <li>Click the pages you want to remove from the visual thumbnail grid</li>
                    <li>Download a new document, with the selected pages cleanly removed</li>
                  </ol>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('delete')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>Delete PDF Pages</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeGuideTab === 'compress' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to compress a PDF</h4>
                  <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal pl-5 leading-relaxed">
                    <li>Open your document with the Compress PDF tool</li>
                    <li>Configure image quality and resolution to balance size and sharpness</li>
                    <li>Compress and download your smaller PDF ready for email sharing</li>
                  </ol>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('compress')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>Compress PDF online</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeGuideTab === 'type' && (
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">How to type on a PDF</h4>
                  <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal pl-5 leading-relaxed">
                    <li>Open your file using the PDF editor</li>
                    <li>Select the Text tool in the top menu</li>
                    <li>Click anywhere on the page to start typing</li>
                    <li>Fill out PDF forms easily, even if no form inputs are present</li>
                    <li>Save and download your filled out document</li>
                  </ol>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onSelectTool('editor')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a651] hover:underline"
                    >
                      <span>Fill out PDF files</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 8. COMPLETE SEJDA LOWER FOOTER (Pages 13-18 of PDF) */}
      <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs pt-12 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Column 1: Resources */}
          <div>
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Resources
            </h5>
            <ul className="space-y-2 text-slate-500">
              <li><span className="hover:text-slate-900 cursor-pointer">Desktop App</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">G Suite Integration</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Education & Teachers</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">About Us</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Product Blog</span></li>
            </ul>
          </div>

          {/* Column 2: API & Developers */}
          <div>
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              API
            </h5>
            <ul className="space-y-2 text-slate-500">
              <li><span className="hover:text-slate-900 cursor-pointer">HTML to PDF API</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Developer Docs</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">REST Endpoints</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Webhooks</span></li>
            </ul>
          </div>

          {/* Column 3: Legal & Security */}
          <div>
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Legal
            </h5>
            <ul className="space-y-2 text-slate-500">
              <li><span className="hover:text-slate-900 cursor-pointer">Terms of Use</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Cookies Settings</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">Security Protocol</span></li>
              <li><span className="hover:text-slate-900 cursor-pointer">SLA</span></li>
            </ul>
          </div>

          {/* Column 4: Popular Tools */}
          <div>
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Tools
            </h5>
            <ul className="space-y-2 text-slate-500">
              <li><span onClick={() => onSelectTool('editor')} className="hover:text-[#00a651] cursor-pointer">PDF Editor</span></li>
              <li><span onClick={() => onSelectTool('compress')} className="hover:text-[#00a651] cursor-pointer">Compress PDF</span></li>
              <li><span onClick={() => onSelectTool('merge')} className="hover:text-[#00a651] cursor-pointer">Merge PDF</span></li>
              <li><span onClick={() => onSelectTool('delete')} className="hover:text-[#00a651] cursor-pointer">Delete Pages</span></li>
              <li><span onClick={() => onSelectTool('pdf_to_word')} className="hover:text-[#00a651] cursor-pointer">PDF to Word</span></li>
              <li><span onClick={() => onSelectTool('protect')} className="hover:text-[#00a651] cursor-pointer">Protect PDF</span></li>
            </ul>
          </div>

          {/* Column 5: Contact & Copyright */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Contact
            </h5>
            <p className="text-slate-500 text-xs">
              <span className="font-mono text-slate-700">hi@documind.com</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              <p>Made in Amsterdam</p>
              <p className="mt-0.5">© DocuMind BV 2013-present.</p>
              <p className="mt-0.5 text-slate-400">Thank you for your time.</p>
            </div>
          </div>
        </div>

        {/* Global Languages Row */}
        <div className="mx-auto max-w-6xl mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-600">Languages:</span>
          <span>English</span>
          <span>•</span>
          <span>Español</span>
          <span>•</span>
          <span>Français</span>
          <span>•</span>
          <span>Deutsch</span>
          <span>•</span>
          <span>Italiano</span>
          <span>•</span>
          <span>Nederlands</span>
          <span>•</span>
          <span>Português</span>
          <span>•</span>
          <span>日本語</span>
          <span>•</span>
          <span>한국어</span>
          <span>•</span>
          <span>हिन्दी</span>
          <span>•</span>
          <span>العربية</span>
        </div>
      </footer>
    </div>
  );
};
