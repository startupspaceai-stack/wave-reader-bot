import { useState } from 'react';
import { DragDropZone } from '@/components/DragDropZone';
import { ChatInterface } from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Waves, FileText } from 'lucide-react';
import oceanWaves from '@/assets/ocean-waves.jpg';

const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<{ file: File; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (file: File, text: string) => {
    setUploadedFile({ file, text });
    setIsProcessing(false);
  };

  const handleNewDocument = () => {
    setUploadedFile(null);
    setIsProcessing(false);
  };

  if (uploadedFile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={handleNewDocument}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>New Document</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium truncate max-w-xs">
                {uploadedFile.file.name}
              </span>
            </div>
          </div>
          
          <div className="h-[calc(100vh-120px)]">
            <ChatInterface 
              pdfText={uploadedFile.text} 
              fileName={uploadedFile.file.name}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ocean Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${oceanWaves})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Waves className="w-20 h-20 text-primary floating-element" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10"></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-ocean-gradient leading-tight">
                Chat with your PDF
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload any PDF document and ask questions about its content. 
                Get instant, intelligent answers powered by AI.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
              <span className="px-3 py-1 bg-primary/10 rounded-full">
                📄 Extract & Analyze
              </span>
              <span className="px-3 py-1 bg-primary/10 rounded-full">
                🤖 AI-Powered
              </span>
              <span className="px-3 py-1 bg-primary/10 rounded-full">
                🔒 Privacy First
              </span>
              <span className="px-3 py-1 bg-primary/10 rounded-full">
                ⚡ Instant Results
              </span>
            </div>
          </div>

          {/* Upload Section */}
          <div className="pt-8">
            <DragDropZone 
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
            />
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="ocean-card p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Smart Extraction</h3>
              <p className="text-sm text-muted-foreground">
                Advanced PDF parsing extracts all text content while preserving structure and context.
              </p>
            </div>
            
            <div className="ocean-card p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Waves className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Natural Conversations</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions in plain English and get contextual answers based on your document.
              </p>
            </div>
            
            <div className="ocean-card p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-primary rounded text-primary-foreground flex items-center justify-center text-xs font-bold">
                  🔒
                </div>
              </div>
              <h3 className="font-semibold mb-2">Privacy Protected</h3>
              <p className="text-sm text-muted-foreground">
                Your documents are processed locally in your browser. No data leaves your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
