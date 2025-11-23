
import React, { useState, useEffect, useMemo } from 'react';
import { AppStep, ImageAsset, NamingConfig, CropSettings, ApiProvider } from './types';
import StepUpload from './StepUpload';
import StepTable from './StepTable';
import StepExport from './StepExport';
import { GoogleGenAI } from "@google/genai";
import { getCroppedImg } from './utils';

// Simple icons
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconKey = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IconSettings = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#3370ff" />
    <g transform="rotate(-90 16 16)">
      <path d="M22 10H14L8 16L14 22H22C23.1 22 24 21.1 24 20V12C24 10.9 23.1 10 22 10Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M16 13.5L16.5 15.5L18.5 16L16.5 16.5L16 18.5L15.5 16.5L13.5 16L15.5 15.5Z" fill="white" transform="translate(17 17) scale(2) translate(-16 -16)"/>
    </g>
  </svg>
);

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [namingConfig, setNamingConfig] = useState<NamingConfig>({
    prefix: 'image',
    start: 1,
    digits: 3
  });
  
  // API Key & Config Management
  const [apiKey, setApiKey] = useState(() => {
    try {
      // Handle potential env not defined issues in pure client builds
      const envKey = (typeof process !== 'undefined' && process.env?.API_KEY) 
        // @ts-ignore - Vite support
        || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY)
        || '';
      return localStorage.getItem('gemini_api_key') || envKey;
    } catch (e) {
      return localStorage.getItem('gemini_api_key') || '';
    }
  });
  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem('gemini_base_url') || '';
  });
  const [modelName, setModelName] = useState(() => {
    return localStorage.getItem('gemini_model_name') || 'gemini-2.5-flash';
  });
  const [apiProvider, setApiProvider] = useState<ApiProvider>(() => {
    return (localStorage.getItem('gemini_api_provider') as ApiProvider) || 'gemini';
  });

  const [showKeyModal, setShowKeyModal] = useState(false);

  // Add AI Prompt state if needed for StepTable custom config
  const [aiPrompt, setAiPrompt] = useState('');

  // Crop Settings State
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    width: undefined,
    height: undefined
  });

  // Persist Config
  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
    
    if (baseUrl) localStorage.setItem('gemini_base_url', baseUrl);
    else localStorage.removeItem('gemini_base_url');

    if (modelName) localStorage.setItem('gemini_model_name', modelName);
    else localStorage.removeItem('gemini_model_name');

    localStorage.setItem('gemini_api_provider', apiProvider);
  }, [apiKey, baseUrl, modelName, apiProvider]);

  useEffect(() => {
    setBaseUrl(apiProvider === 'gemini' ? '/google-api' : '/openai-api');
  }, [apiProvider]);

  // Auto-rename when images or config changes
  useEffect(() => {
    const newImages = images.map((img, index) => {
      const num = String(namingConfig.start + index).padStart(namingConfig.digits, '0');
      const newName = `${namingConfig.prefix}${num}`;
      if (img.fileName !== newName) {
        return { ...img, fileName: newName };
      }
      return img;
    });
    
    const hasChanges = newImages.some((img, i) => img.fileName !== images[i].fileName);
    if (hasChanges) {
      setImages(newImages);
    }
  }, [namingConfig, images]);

  // AI Client - Recreated when config changes (Only used for Gemini provider)
  const ai = useMemo(() => {
    const options: any = { apiKey };
    if (baseUrl) {
      options.baseUrl = baseUrl;
    }
    return new GoogleGenAI(options);
  }, [apiKey, baseUrl]);

  const handleNext = async () => {
    if (step === AppStep.UPLOAD) {
      // Process crops before moving to next step
      setIsProcessing(true);
      try {
        const processedImages = await Promise.all(images.map(async (img) => {
          try {
            // Apply crop with potential resizing if cropSettings are set
            const blob = await getCroppedImg(
              img.previewUrl, 
              img.crop, 
              0, 
              cropSettings.width, 
              cropSettings.height
            );
            return {
              ...img,
              croppedBlob: blob || undefined,
              croppedUrl: blob ? URL.createObjectURL(blob) : img.previewUrl
            };
          } catch (e) {
            console.error("Failed to crop", img.fileName, e);
            return img;
          }
        }));
        setImages(processedImages);
        setStep(AppStep.CAPTION);
      } catch (e) {
        console.error("Error processing images", e);
        alert("处理裁剪图片时出错，请查看控制台。");
      } finally {
        setIsProcessing(false);
      }
    } else if (step === AppStep.CAPTION) {
      setStep(AppStep.EXPORT);
    } else if (step === AppStep.EXPORT) {
      // Reset application state to empty
      // Cleanup memory
      images.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        if (img.croppedUrl && img.croppedUrl !== img.previewUrl) URL.revokeObjectURL(img.croppedUrl);
      });
      
      setImages([]);
      setStep(AppStep.UPLOAD);
    }
  };

  const handleBack = () => {
    if (step === AppStep.CAPTION) setStep(AppStep.UPLOAD);
    else if (step === AppStep.EXPORT) setStep(AppStep.CAPTION);
  };

  // Validation checks
  const isNextDisabled = () => {
    if (isProcessing) return true;
    
    // Step 1: Must have at least one image
    if (step === AppStep.UPLOAD && images.length === 0) return true;
    
    // Step 2: Must have AI content generated (check if any subject en exists)
    if (step === AppStep.CAPTION) {
       const hasContent = images.some(img => img.metadata?.subject?.en);
       return !hasContent;
    }

    return false;
  };

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="flex flex-col h-full max-w-6xl mx-auto w-full bg-white border-x border-gray-100">
        {/* Header Steps */}
        <div className="bg-white border-b px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Logo />
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                AutoTag
              </h1>
            </div>
            <button 
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors shadow-sm ${
                !apiKey 
                  ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' 
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-primary hover:border-primary/30'
              }`}
              title="设置 API & 模型"
            >
              <IconSettings />
              <span>模型配置</span>
              {!apiKey && <span className="flex h-2 w-2 relative ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <StepIndicator num={1} label="上传与裁剪" active={step === AppStep.UPLOAD} completed={step > AppStep.UPLOAD} />
            <div className="w-8 h-px bg-gray-300"></div>
            <StepIndicator num={2} label="AI 标注与分析" active={step === AppStep.CAPTION} completed={step > AppStep.CAPTION} />
            <div className="w-8 h-px bg-gray-300"></div>
            <StepIndicator num={3} label="导出" active={step === AppStep.EXPORT} completed={step > AppStep.EXPORT} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-white relative flex flex-col">
          {step === AppStep.UPLOAD && (
            <StepUpload 
              images={images} 
              setImages={setImages} 
              namingConfig={namingConfig} 
              setNamingConfig={setNamingConfig}
              cropSettings={cropSettings}
              setCropSettings={setCropSettings}
            />
          )}
          {step === AppStep.CAPTION && (
            <StepTable 
              images={images} 
              setImages={setImages}
              ai={ai}
              modelName={modelName}
              apiProvider={apiProvider}
              apiKey={apiKey}
              baseUrl={baseUrl}
              onShowSettings={() => setShowKeyModal(true)}
            />
          )}
          {step === AppStep.EXPORT && (
            <StepExport 
              images={images} 
            />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-white border-t p-4 flex justify-end items-center shrink-0 gap-3">
          <button 
            onClick={handleBack}
            disabled={step === AppStep.UPLOAD || isProcessing}
            className={`px-6 py-2 rounded-md border border-gray-200 font-medium transition-colors ${step === AppStep.UPLOAD ? 'invisible' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            上一步
          </button>
          <button 
            onClick={handleNext}
            disabled={isNextDisabled()}
            className={`px-6 py-2 rounded-md bg-primary text-white font-medium hover:bg-primaryHover transition-colors flex items-center gap-2 ${isNextDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {step === AppStep.EXPORT ? '完成' : '下一步'}
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal 
          currentKey={apiKey} 
          currentBaseUrl={baseUrl}
          currentModelName={modelName}
          currentProvider={apiProvider}
          onSave={(key, url, model, provider) => { 
            setApiKey(key.trim()); 
            setModelName(model.trim());
            setApiProvider(provider);
            setBaseUrl(provider === 'gemini' ? '/google-api' : '/openai-api');
            setShowKeyModal(false); 
          }}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  );
}

function StepIndicator({ num, label, active, completed }: { num: number, label: string, active: boolean, completed: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'text-primary font-semibold' : completed ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
        active ? 'border-primary bg-primary text-white' : 
        completed ? 'border-green-600 bg-green-600 text-white' : 
        'border-gray-300 bg-white'
      }`}>
        {completed ? <IconCheck /> : num}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function ApiKeyModal({ 
  currentKey, 
  currentBaseUrl, 
  currentModelName,
  currentProvider,
  onSave, 
  onClose 
}: { 
  currentKey: string, 
  currentBaseUrl: string, 
  currentModelName: string,
  currentProvider: ApiProvider,
  onSave: (key: string, url: string, model: string, provider: ApiProvider) => void, 
  onClose: () => void 
}) {
  const [keyVal, setKeyVal] = useState(currentKey);
  const [urlVal, setUrlVal] = useState(currentBaseUrl);
  const [modelVal, setModelVal] = useState(currentModelName);
  const [providerVal, setProviderVal] = useState<ApiProvider>(currentProvider);
  
  useEffect(() => {
    if (providerVal === 'gemini') {
      setUrlVal('/google-api');
    } else {
      setUrlVal('/openai-api');
    }
  }, [providerVal]);

  const handleProviderChange = (newProvider: ApiProvider) => {
    setProviderVal(newProvider);
    // Auto switch model name suggestion if using default
    if (newProvider === 'openai') {
       if (modelVal === 'gemini-2.5-flash') setModelVal('');
    } else {
       if (!modelVal) setModelVal('gemini-2.5-flash');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <IconSettings /> 模型与接口配置
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API 协议类型</label>
            <select 
              value={providerVal}
              onChange={(e) => handleProviderChange(e.target.value as ApiProvider)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="gemini">Google Gemini (原生)</option>
              <option value="openai">OpenAI 兼容 (豆包/DeepSeek)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {providerVal === 'gemini' ? '适用于 Google 官方 Gemini API。' : '适用于豆包、DeepSeek 等兼容 OpenAI 接口的模型。'}
            </p>
          </div>

          {/* Proxy Toggle */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span>已启用本地代理</span>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (已锁定)</label>
            <input 
              type="text" 
              value={urlVal}
              readOnly
              className={`w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary ${
                'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
              placeholder={providerVal === 'gemini' ? "https://generativelanguage.googleapis.com" : "https://api.openai.com/v1"}
            />
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Name / Endpoint ID</label>
            <input 
              type="text" 
              value={modelVal}
              onChange={(e) => setModelVal(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={providerVal === 'gemini' ? "gemini-2.5-flash" : "ep-20240604..."}
            />
            {providerVal === 'openai' && (
              <p className="text-xs text-orange-500 mt-1">
                注意：对于豆包/Volcengine，请在此处填写 **推理接入点 ID** (如 ep-202...)，而不是模型名称。
              </p>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="relative">
              <input 
                type="password" 
                value={keyVal}
                onChange={(e) => setKeyVal(e.target.value)}
                className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="sk-..."
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <IconKey />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Key 仅保存在浏览器本地缓存中，不会上传至任何服务器。
            </p>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => onSave(keyVal, urlVal, modelVal, providerVal)}
            className="px-4 py-2 rounded text-sm bg-primary text-white font-medium hover:bg-primaryHover transition-colors shadow-sm"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
