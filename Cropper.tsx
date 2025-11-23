
import React, { useState, useRef, useEffect } from 'react';
import { CropArea } from './types';
import { createImage } from './utils';

interface CropperProps {
  imageSrc: string;
  initialCrop?: CropArea;
  aspectRatio?: number; // width / height
  onComplete: (crop: CropArea) => void;
  onCancel: () => void;
}

export default function Cropper({ imageSrc, initialCrop, aspectRatio, onComplete, onCancel }: CropperProps) {
  const [crop, setCrop] = useState<CropArea>(initialCrop || { x: 10, y: 10, width: 80, height: 80 });
  const [imgDimensions, setImgDimensions] = useState<{w: number, h: number} | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef<string | null>(null);
  const startPos = useRef<{x: number, y: number, crop: CropArea} | null>(null);

  // Load image natural dimensions to handle aspect ratio calculations correctly
  useEffect(() => {
    createImage(imageSrc).then(img => {
      setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    });
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = type;
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop }
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !startPos.current || !imageRef.current) return;
      
      // Use the displayed image rect for calculations
      const rect = imageRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const deltaX = ((e.clientX - startPos.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - startPos.current.y) / rect.height) * 100;
      const startCrop = startPos.current.crop;

      let newCrop = { ...crop };

      if (isDragging.current === 'move') {
        newCrop.x = Math.min(Math.max(startCrop.x + deltaX, 0), 100 - startCrop.width);
        newCrop.y = Math.min(Math.max(startCrop.y + deltaY, 0), 100 - startCrop.height);
      } else if (isDragging.current === 'se') {
        let newWidth = Math.min(Math.max(startCrop.width + deltaX, 5), 100 - startCrop.x);
        let newHeight = Math.min(Math.max(startCrop.height + deltaY, 5), 100 - startCrop.y);

        if (aspectRatio && imgDimensions) {
          // Enforce Aspect Ratio
          // Ratio = (WidthPx) / (HeightPx)
          // Ratio = (newWidth% * ImgW) / (newHeight% * ImgH)
          // newHeight% = (newWidth% * ImgW) / (ImgH * Ratio)
          
          // We drive height based on width to start
          const calculatedHeight = (newWidth * imgDimensions.w) / (imgDimensions.h * aspectRatio);
          
          if (calculatedHeight + startCrop.y <= 100) {
             newHeight = calculatedHeight;
          } else {
             // If height overflows, clamp height and recalculate width
             newHeight = 100 - startCrop.y;
             newWidth = (newHeight * imgDimensions.h * aspectRatio) / imgDimensions.w;
          }
        }

        newCrop.width = newWidth;
        newCrop.height = newHeight;
      } 
      
      setCrop(newCrop);
    };

    const handleMouseUp = () => {
      isDragging.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [crop, aspectRatio, imgDimensions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <div className="bg-white rounded-lg shadow-2xl p-4 max-w-4xl w-full flex flex-col gap-4 max-h-[90vh]">
        <div className="flex justify-between items-center shrink-0">
          <h3 className="text-lg font-semibold">裁剪图片 {aspectRatio ? '(比例锁定)' : ''}</h3>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button>
            <button onClick={() => onComplete(crop)} className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primaryHover">完成</button>
          </div>
        </div>
        
        {/* Container for Image + Overlay */}
        <div className="relative flex-1 bg-gray-900 rounded overflow-hidden flex items-center justify-center select-none min-h-0">
          {/* Wrapper div that tightly fits the image content */}
          <div className="relative inline-block">
            <img 
              ref={imageRef}
              src={imageSrc} 
              alt="Crop target" 
              className="max-w-full max-h-[70vh] object-contain pointer-events-none block" 
              style={{ touchAction: 'none' }}
            />
            
            {/* Overlay (Absolute relative to the image wrapper) */}
            {imageRef.current && (
              <div 
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                  boxSizing: 'border-box'
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Resize Handle SE */}
                <div 
                  className="absolute bottom-[-6px] right-[-6px] w-4 h-4 bg-primary border-2 border-white rounded-full cursor-se-resize hover:scale-125 transition-transform z-10"
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center shrink-0">
          拖动选框移动位置，拖动右下角蓝点调整大小
        </div>
      </div>
    </div>
  );
}
