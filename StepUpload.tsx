
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { ImageAsset, NamingConfig, CropSettings } from './types';
import { createImage, getCenteredCrop } from './utils';
import Cropper from './Cropper';

interface Props {
  images: ImageAsset[];
  setImages: React.Dispatch<React.SetStateAction<ImageAsset[]>>;
  namingConfig: NamingConfig;
  setNamingConfig: React.Dispatch<React.SetStateAction<NamingConfig>>;
  cropSettings: CropSettings;
  setCropSettings: React.Dispatch<React.SetStateAction<CropSettings>>;
}

export default function StepUpload({ 
  images, 
  setImages, 
  namingConfig, 
  setNamingConfig,
  cropSettings,
  setCropSettings
}: Props) {
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);
  
  const [customW, setCustomW] = useState<string>('');
  const [customH, setCustomH] = useState<string>('');
  
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sorting State
  const dragItem = useRef<number | null>(null);

  // Helper to restrict input to >= 1
  const handleDimensionChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value === '') {
      setter('');
      return;
    }
    const num = parseFloat(value);
    // Prevent values less than 1 (0, negative numbers, etc.)
    if (!isNaN(num) && num >= 1) {
      setter(value);
    }
  };

  // Calculate numeric ratio if valid inputs exist
  const activeRatio = useMemo(() => {
    const w = parseFloat(customW);
    const h = parseFloat(customH);
    if (!w || !h || isNaN(w) || isNaN(h) || h === 0) return null;
    return w / h;
  }, [customW, customH]);

  // Update global crop settings when inputs change
  useEffect(() => {
    const w = parseFloat(customW);
    const h = parseFloat(customH);
    setCropSettings({
      width: !isNaN(w) && w > 0 ? w : undefined,
      height: !isNaN(h) && h > 0 ? h : undefined
    });
  }, [customW, customH, setCropSettings]);

  // Auto-apply ratio/size to all images when input changes
  useEffect(() => {
    if (!activeRatio || images.length === 0) return;
    
    const w = parseFloat(customW);
    const h = parseFloat(customH);

    const timer = setTimeout(async () => {
      const updated = await Promise.all(images.map(async (img) => {
        try {
           const imageEl = await createImage(img.previewUrl);
           // Pass w and h to enable pixel-perfect crop calculation
           const newCrop = getCenteredCrop(imageEl.naturalWidth, imageEl.naturalHeight, activeRatio, w, h);
           return { ...img, crop: newCrop };
        } catch(e) {
           return img;
        }
      }));
      
      setImages(updated);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeRatio, customW, customH, images.length]); 


  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const w = parseFloat(customW);
      const h = parseFloat(customH);

      const newImages = await Promise.all(files.map(async (file) => {
        const url = URL.createObjectURL(file);
        let crop = { x: 0, y: 0, width: 100, height: 100 };

        // Wait for image load to get true dimensions
        let naturalW = 0; 
        let naturalH = 0;

        try {
          const img = await createImage(url);
          naturalW = img.naturalWidth;
          naturalH = img.naturalHeight;
          if (activeRatio) {
             // Pass w and h for precise sizing
             crop = getCenteredCrop(naturalW, naturalH, activeRatio, w, h);
          }
        } catch (e) {
          console.warn("Could not load image for cropping", file.name);
        }

        return {
          id: Math.random().toString(36).substr(2, 9),
          originalFile: file,
          previewUrl: url,
          fileName: '',
          caption: '',
          isGenerating: false,
          crop: crop,
          width: naturalW,
          height: naturalH
        } as ImageAsset;
      }));
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error("Error processing files", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      processFiles(files);
      e.target.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
      processFiles(files);
    }
  }, [activeRatio, customW, customH]); 

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Only show file drag styling if dragging files, not internal elements
    if (e.dataTransfer.types.includes('Files')) {
       setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleRemove = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const handleCropComplete = async (newCrop: any) => {
    if (cropTargetId) {
      setImages(images.map(img => img.id === cropTargetId ? { ...img, crop: newCrop } : img));
    }
    setCropTargetId(null);
  };

  // --- Sorting Handlers ---
  const handleSortStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSortEnter = (e: React.DragEvent, index: number) => {
    if (dragItem.current === null) return;
    if (dragItem.current === index) return;

    // Swap items in array
    const newImages = [...images];
    const draggedImage = newImages[dragItem.current];
    newImages.splice(dragItem.current, 1);
    newImages.splice(index, 0, draggedImage);

    setImages(newImages);
    dragItem.current = index;
  };

  const handleSortEnd = () => {
    dragItem.current = null;
  };

  const activeCropImage = images.find(i => i.id === cropTargetId);

  return (
    <div 
      className={`h-full flex flex-col p-6 overflow-hidden transition-colors ${isDraggingFile ? 'bg-blue-50 ring-4 ring-inset ring-blue-200' : 'bg-white'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Toolbar - Removed border and shadow */}
      <div className="bg-white pb-4 mb-2 flex flex-wrap gap-6 items-center z-10 flex-row">
        
        {/* Crop Config */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">裁剪尺寸</label>
          <div className="flex items-center gap-1">
              <div className="relative">
                <input 
                    type="number"
                    min="1" 
                    value={customW}
                    onChange={(e) => handleDimensionChange(e.target.value, setCustomW)}
                    className="w-24 border rounded pl-2 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-left"
                    placeholder="宽"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">px</span>
              </div>
              
              <span className="text-gray-400 text-xs">x</span>
              
              <div className="relative">
                <input 
                    type="number" 
                    min="1"
                    value={customH}
                    onChange={(e) => handleDimensionChange(e.target.value, setCustomH)}
                    className="w-24 border rounded pl-2 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-left"
                    placeholder="高"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">px</span>
              </div>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        {/* Series Config */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">命名前缀</label>
          <input 
            type="text" 
            value={namingConfig.prefix}
            onChange={(e) => setNamingConfig({...namingConfig, prefix: e.target.value})}
            className="border rounded px-2 py-1.5 text-sm w-32 focus:ring-2 focus:ring-primary outline-none transition-all"
            placeholder="例如: image"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">起始序号</label>
          <input 
            type="number" 
            value={namingConfig.start}
            onChange={(e) => setNamingConfig({...namingConfig, start: parseInt(e.target.value) || 1})}
            className="border rounded px-2 py-1.5 text-sm w-20 focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
        {images.length === 0 ? (
          <label className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
            <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p className="font-medium">拖拽图片至此</p>
            <p className="text-sm mt-1">或点击此处上传</p>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />
          </label>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {images.map((img, index) => (
              <div 
                key={img.id} 
                draggable
                onDragStart={(e) => handleSortStart(e, index)}
                onDragEnter={(e) => handleSortEnter(e, index)}
                onDragEnd={handleSortEnd}
                onDragOver={(e) => e.preventDefault()} // Required for drop to work
                className="group bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow relative cursor-move"
              >
                <div className="aspect-square bg-gray-900/5 relative overflow-hidden flex items-center justify-center">
                  {/* Render with Crop Mask Overlay */}
                  <ThumbnailWithCrop img={img} />
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20 cursor-default">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCropTargetId(img.id); }}
                      className="p-2 bg-white rounded-full text-gray-800 hover:bg-primary hover:text-white transition-colors shadow-sm"
                      title="调整裁剪"
                      onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemove(img.id); }}
                      className="p-2 bg-white rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                      title="移除"
                      onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
                <div className="p-2 text-xs font-mono bg-gray-50 border-t truncate text-center text-gray-600 select-none">
                  {img.fileName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cropper Modal */}
      {cropTargetId && activeCropImage && (
        <Cropper 
          imageSrc={activeCropImage.previewUrl}
          initialCrop={activeCropImage.crop}
          aspectRatio={activeRatio || undefined}
          onComplete={handleCropComplete}
          onCancel={() => setCropTargetId(null)}
        />
      )}
    </div>
  );
}

/**
 * Subcomponent to handle image loading and correct overlay positioning
 */
function ThumbnailWithCrop({ img }: { img: ImageAsset }) {
  const [dims, setDims] = useState({ w: img.width || 0, h: img.height || 0 });
  
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.target as HTMLImageElement;
    if (el.naturalWidth !== dims.w || el.naturalHeight !== dims.h) {
      setDims({ w: el.naturalWidth, h: el.naturalHeight });
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
       <img 
         src={img.previewUrl} 
         onLoad={handleLoad}
         draggable={false}
         className="max-w-full max-h-full object-contain block select-none" 
         alt="preview" 
       />
       
       {/* Overlay Mask */}
       {dims.w > 0 && (
         <div 
           className="absolute pointer-events-none"
           style={{
             aspectRatio: `${dims.w} / ${dims.h}`,
             maxWidth: '100%',
             maxHeight: '100%',
             width: dims.w >= dims.h ? '100%' : 'auto',
             height: dims.h > dims.w ? '100%' : 'auto'
           }}
         >
            {/* The Cutout Mask */}
            <div 
              className="absolute border border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
              style={{
                left: `${img.crop.x}%`,
                top: `${img.crop.y}%`,
                width: `${img.crop.width}%`,
                height: `${img.crop.height}%`
              }}
            ></div>
         </div>
       )}
    </div>
  );
}
