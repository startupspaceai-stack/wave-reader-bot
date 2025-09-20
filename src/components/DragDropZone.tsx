import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DragDropZoneProps {
  onFileUpload: (file: File, text: string) => void;
  isProcessing: boolean;
}

export const DragDropZone = ({ onFileUpload, isProcessing }: DragDropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const processPDF = async (file: File): Promise<string> => {
    // Import PDF.js dynamically
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item): item is any => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  };

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a PDF file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Processing PDF",
        description: "Extracting text from your document...",
      });

      const extractedText = await processPDF(file);
      
      if (!extractedText.trim()) {
        toast({
          title: "No text found",
          description: "This PDF appears to be empty or contains only images.",
          variant: "destructive",
        });
        return;
      }

      onFileUpload(file, extractedText);
      
      toast({
        title: "PDF uploaded successfully!",
        description: `Extracted ${extractedText.length} characters. You can now ask questions about your document.`,
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Processing failed",
        description: "Failed to extract text from the PDF. Please try again.",
        variant: "destructive",
      });
    }
  }, [onFileUpload, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`drag-area ${isDragOver ? 'drag-over' : ''} wave-animation`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="floating-element">
              <Waves className="w-16 h-16 text-primary/60" />
            </div>
            <Upload className="w-12 h-12 text-primary absolute -top-2 -right-2" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-ocean-gradient">
              Drop your PDF here
            </h3>
            <p className="text-muted-foreground">
              Or click to browse your files
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF files up to 10MB
            </p>
          </div>

          <Button
            variant="default"
            size="lg"
            className="btn-ocean"
            disabled={isProcessing}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <FileText className="w-5 h-5 mr-2" />
            {isProcessing ? 'Processing...' : 'Choose PDF File'}
          </Button>

          <input
            id="file-input"
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};