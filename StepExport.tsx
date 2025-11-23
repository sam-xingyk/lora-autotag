import React, { useState } from 'react';
import { ImageAsset } from './types';
import { createZip, saveZip } from './utils';

interface Props {
  images: ImageAsset[];
}

export default function StepExport({ images }: Props) {
  const [isZipping, setIsZipping] = useState(false);

  const handleExport = async () => {
    setIsZipping(true);
    try {
      const zipBlob = await createZip(images);
      saveZip(zipBlob, "dataset_export.zip");
    } catch (e) {
      console.error(e);
      alert("Failed to create zip file.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
      <div className="max-w-md w-full">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">准备导出</h2>
        <p className="text-gray-500 mb-8">
          您已准备好 <span className="font-bold text-gray-900">{images.length}</span> 张图片及其描述。
        </p>

        <div className="bg-white rounded p-6 mb-8 text-left text-sm text-gray-600 border border-gray-200 shadow-sm">
          <p className="mb-3 font-semibold text-gray-800">导出包含内容:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <svg className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              {images.length} 张裁剪后的图片文件
            </li>
            <li className="flex items-center gap-2">
              <svg className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              {images.length} 个对应的文本描述文件 (.txt)
            </li>
          </ul>
        </div>

        <button 
          onClick={handleExport}
          disabled={isZipping}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold shadow hover:bg-primaryHover hover:shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isZipping ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              正在打包...
            </>
          ) : (
            "下载 ZIP 压缩包"
          )}
        </button>
      </div>
    </div>
  );
}