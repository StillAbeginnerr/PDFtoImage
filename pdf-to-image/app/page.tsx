'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PDFToImageConverter = () => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  useEffect(() => {
    const initPdfJs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).toString();
        setPdfjsLib(pdfjs);
      } catch (err) {
        console.error('Error loading PDF.js:', err);
        setError('Failed to load PDF processor');
      }
    };

    initPdfJs();
  }, []);

  const convertPDFToImages = async (file: File) => {
    if (!pdfjsLib) {
      setError('PDF processor not initialized');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImages([]);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const imagePromises: Promise<string>[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (!context) {
          throw new Error('Canvas context is null');
        }

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const imageUrl = canvas.toDataURL('image/png');
        imagePromises.push(Promise.resolve(imageUrl));
      }

      const newImages = await Promise.all(imagePromises);
      setImages(newImages);
    } catch (err) {
      console.error('PDF conversion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to convert PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      convertPDFToImages(file);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Converting PDF to images...</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((imageUrl, index) => (
          <div key={index} className="border rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">Page {index + 1}</p>
            <img
              src={imageUrl}
              alt={`Page ${index + 1}`}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PDFToImageConverter;