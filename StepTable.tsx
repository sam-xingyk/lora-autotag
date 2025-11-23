
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ImageAsset, ApiProvider, ImageMetadata } from './types';

interface Props {
  images: ImageAsset[];
  setImages: React.Dispatch<React.SetStateAction<ImageAsset[]>>;
  ai: GoogleGenAI;
  modelName: string;
  apiProvider: ApiProvider;
  apiKey: string;
  baseUrl: string;
  onShowSettings: () => void;
}

// --- Icons ---
const IconText = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>;
const IconHash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IconImage = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconMagic = () => (
  <svg className="w-4 h-4" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <path d="M930.909091 344.436364c-41.890909-111.709091-130.327273-209.454545-242.036364-256-102.4-51.2-232.727273-51.2-349.090909-9.309091-74.472727 27.927273-134.981818 69.818182-186.181818 121.018182l-9.309091 13.963636V93.090909c0-23.272727-13.963636-41.890909-41.890909-41.890909-27.927273 0-41.890909 18.618182-41.890909 41.890909v251.345455c0 23.272727 13.963636 41.890909 41.890909 41.890909h251.345455c23.272727 0 41.890909-13.963636 41.890909-41.890909 0-23.272727-13.963636-41.890909-41.890909-41.890909H186.181818l9.309091-9.309091c41.890909-60.509091 97.745455-107.054545 167.563636-134.981819 88.436364-37.236364 195.490909-32.581818 288.581819 9.309091 88.436364 41.890909 158.254545 111.709091 195.490909 204.8 37.236364 93.090909 37.236364 200.145455-4.654546 293.236364-41.890909 88.436364-111.709091 158.254545-204.8 195.490909-88.436364 37.236364-195.490909 32.581818-288.581818-9.309091-88.436364-41.890909-158.254545-111.709091-195.490909-204.8-4.654545-13.963636-23.272727-27.927273-37.236364-27.927273-4.654545 0-9.309091 0-18.618181 4.654546s-18.618182 13.963636-23.272728 23.272727c-4.654545 9.309091-4.654545 23.272727 0 32.581818 41.890909 111.709091 130.327273 209.454545 242.036364 256 60.509091 27.927273 125.672727 41.890909 190.836364 41.890909 55.854545 0 116.363636-9.309091 162.90909-27.927272 111.709091-41.890909 209.454545-130.327273 256-242.036364 41.890909-125.672727 46.545455-251.345455 4.654546-363.054545z" fill="currentColor" />
  </svg>
);
const IconLock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

// --- Constants ---

// Exact pixel widths for sticky columns to ensure alignment
const WIDTH_INDEX = 48;
const WIDTH_IMAGE = 80;
const WIDTH_CAPTION = 256;

// Calculated left positions
const LEFT_INDEX = 0;
const LEFT_IMAGE = WIDTH_INDEX;
const LEFT_CAPTION = WIDTH_INDEX + WIDTH_IMAGE;

// Color Palette for Feishu Style
const COLORS = {
  headerGray: 'bg-[#F5F6F7]',
  headerYellow: 'bg-[#FFFDE7]', // Yellow 50
  headerOrange: 'bg-[#FFF3E0]', // Orange 50
  headerGreen: 'bg-[#E8F5E9]', // Green 50
  headerBlue: 'bg-[#E3F2FD]', // Blue 50
  headerPurple: 'bg-[#F3E5F5]', // Purple 50
  headerPink: 'bg-[#FCE4EC]', // Pink 50
  
  cellWhite: 'bg-white',
  cellYellow: 'bg-[#FFFDE7]', 
  cellOrange: 'bg-[#FFF3E0]',
  cellGreen: 'bg-[#E8F5E9]',
  cellBlue: 'bg-[#E3F2FD]',
  cellPurple: 'bg-[#F3E5F5]',
  cellPink: 'bg-[#FCE4EC]',
};

const METADATA_COLUMNS = [
  { key: 'subject', label: '主题内容', bgHeader: COLORS.headerYellow, bgCell: COLORS.cellYellow, width: 'min-w-[220px]' },
  { key: 'scene', label: '场景特征', bgHeader: COLORS.headerOrange, bgCell: COLORS.cellOrange, width: 'min-w-[220px]' },
  { key: 'lighting', label: '环境光照', bgHeader: COLORS.headerGreen, bgCell: COLORS.cellGreen, width: 'min-w-[200px]' },
  { key: 'perspective', label: '画幅视角', bgHeader: COLORS.headerGray, bgCell: COLORS.cellWhite, width: 'min-w-[200px]' }, // Gray for neutral
  { key: 'quality', label: '画面质量', bgHeader: COLORS.headerBlue, bgCell: COLORS.cellBlue, width: 'min-w-[220px]' },
  { key: 'style', label: '画面风格', bgHeader: COLORS.headerPurple, bgCell: COLORS.cellPurple, width: 'min-w-[200px]' },
];

export default function StepTable({ 
  images, 
  setImages,
  ai,
  modelName,
  apiProvider,
  apiKey,
  baseUrl,
  onShowSettings
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalTrigger, setGlobalTrigger] = useState('');

  // --- Helpers ---
  
  const integrateCaption = (img: ImageAsset, newMeta?: Partial<ImageMetadata>) => {
    const meta = newMeta ? { ...img.metadata!, ...newMeta } : img.metadata;
    if (!meta) return img.caption;

    const parts = [
      meta.triggerWord,
      meta.subject.en,
      meta.scene.en,
      meta.lighting.en,
      meta.perspective.en,
      meta.quality.en,
      meta.style.en
    ].filter(s => s && s.trim().length > 0);

    return parts.join(', ');
  };

  const updateMetadata = (id: string, field: keyof ImageMetadata | string, value: string) => {
    setImages(prev => prev.map(img => {
      if (img.id !== id) return img;

      const currentMeta = img.metadata || {
        triggerWord: '', aiUnderstanding: '',
        subject: { en: '', cn: '' },
        scene: { en: '', cn: '' },
        lighting: { en: '', cn: '' },
        perspective: { en: '', cn: '' },
        quality: { en: '', cn: '' },
        style: { en: '', cn: '' }
      };

      let newMeta = { ...currentMeta };

      if (field.includes('.')) {
        const [key, subKey] = field.split('.') as [keyof ImageMetadata, 'en' | 'cn'];
        // @ts-ignore
        newMeta[key] = { ...newMeta[key], [subKey]: value };
      } else {
        // @ts-ignore
        newMeta[field] = value;
      }

      return {
        ...img,
        metadata: newMeta,
        caption: integrateCaption(img, newMeta)
      };
    }));
  };

  const applyGlobalTrigger = () => {
    setImages(prev => prev.map(img => {
      const currentMeta = img.metadata || {
        triggerWord: '', aiUnderstanding: '',
        subject: { en: '', cn: '' },
        scene: { en: '', cn: '' },
        lighting: { en: '', cn: '' },
        perspective: { en: '', cn: '' },
        quality: { en: '', cn: '' },
        style: { en: '', cn: '' }
      };
      const newMeta = { ...currentMeta, triggerWord: globalTrigger };
      return {
        ...img,
        metadata: newMeta,
        caption: integrateCaption(img, newMeta)
      };
    }));
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- AI Logic ---

  const callOpenAI = async (base64Content: string, prompt: string, mimeType: string) => {
    if (!baseUrl) throw new Error("Base URL is required for OpenAI compatible providers.");

    const isDoubao = baseUrl.includes('/doubao-api');
    const endpoint = isDoubao ? '/api/v3/chat/completions' : '/v1/chat/completions';
    const url = `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
    const safeModelName = modelName.trim(); // Safety Trim
    
    const body = {
      model: safeModelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:${mimeType};base64,${base64Content}`,
                detail: "auto"
              } 
            }
          ]
        }
      ],
      max_tokens: 4096
      // Removed response_format: { type: "json_object" } for compatibility
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      if (resp.status === 404) {
        throw new Error(`找不到模型或接入点 (404)。请检查 Model Name 是否填写正确 (当前: "${safeModelName}")，且您有权访问该接入点。`);
      }
      
      const errText = await resp.text();
      let errMsg = errText;
      try {
         const json = JSON.parse(errText);
         if (json.error && json.error.message) {
             errMsg = json.error.message;
         }
      } catch(e) {}
      
      if (errMsg.includes("Model do not support image input") || errMsg.includes("InvalidParameter")) {
          throw new Error("当前配置的模型不支持图片识别（Vision）能力。请检查您的 [Model Name] 是否填写了正确的支持视觉的接入点 ID (例如 doubao-pro-4k-vision)。");
      }

      throw new Error(`OpenAI API Error (${resp.status}): ${errMsg}`);
    }

    const data = await resp.json();
    return data.choices[0].message.content;
  };

  const generateAnalysis = async (img: ImageAsset) => {
    if (!apiKey) {
      onShowSettings();
      return;
    }

    setImages(prev => prev.map(i => i.id === img.id ? { ...i, isGenerating: true } : i));

    try {
      let blob = img.croppedBlob;
      if (!blob) {
        const resp = await fetch(img.croppedUrl || img.previewUrl);
        blob = await resp.blob();
      }
      
      const base64 = await blobToBase64(blob);
      const mimeType = blob.type || 'image/jpeg';

      // Detailed Prompt provided by user
      const prompt = `
你是一名艺术与设计专业的教授。分析图像中的内容，并整理成一组提示词用来描述图像中的内容，必须是单独的提示词不能是句子，每一个提示词都需要使用英文来表达。
# Prompt 格式要求
下面我将说明 prompt 的生成步骤，这里的 prompt 可用于描述人物、风景、物体或抽象数字艺术图画。你可以根据需要添加合理的、但不少于5处的画面细节。
# prompt 要求
1. prompt 内容包含画面的主题内容，场景特征，环境光照，画幅视角，画面质量，画面风格部分，但你输出的 prompt 不能分段，例如类似"medium:"这样的分段描述是不需要的，也不能包含":"和"."。
2. 画面主体：不简短的英文描述画面主体, 如 A girl in a garden，主体细节概括（主体可以是人、事、物、景）画面核心内容。这部分根据我每次给你的主题来生成。你可以添加更多主题相关的合理的细节。
3. 对于人物主题，你必须描述人物的眼睛、鼻子、嘴唇，例如'beautiful detailed eyes,beautiful detailed lips,extremely detailed eyes and face,longeyelashes'，以免Stable Diffusion随机生成变形的面部五官，这点非常重要。你还可以描述人物的外表、情绪、衣服、姿势、视角、动作、背景等。人物属性中，1girl表示一个女孩，2girls表示两个女孩。
4. 材质：用来制作艺术品的材料。 例如：插图、油画、3D 渲染和摄影。 Medium 有很强的效果，因为一个关键字就可以极大地改变风格。
5. 附加细节：画面场景细节，或人物细节，描述画面细节内容，让图像看起来更充实和合理。这部分是可选的，要注意画面的整体和谐，不能与主题冲突。
6. 你可以根据主题的需求添加：HDR,UHD,studio lighting,ultra-fine painting,sharp focus,physically-based rendering,extreme detail description,professional,vivid colors,bokeh。
7. 艺术风格：这部分描述图像的风格。加入恰当的艺术风格，能提升生成的图像效果。常用的艺术风格例如：portraits,landscape,horror,anime,sci-fi,photography,concept artists等。
8. 色彩色调：颜色，通过添加颜色来控制画面的整体颜色。
9. 灯光：整体画面的光线效果。
# Prompt 举例
1. <male, young adult, black hair, short hair, Asian, wearing suit, white dress shirt, black trousers, black shoes, formal attire, standing, confident pose, hand in pocket, 3D rendering, realistic style, white background, full body view, stylish, professional, >
2. <traditional Chinese architecture, ancient temple complex, lotus flowers, mountain peaks, green hills, curved bridges, oriental garden, flowing water, white blossoms, tree branches, stone formations, sacred landscape, temple roofs, red pillars, green foliage, misty atmosphere, dreamy scene, ancient Chinese, curved pathways, floating islands, decorative elements, jade color palette, soft lighting, diffused glow, aerial perspective, panoramic view, wide format, horizontal composition, depth of field, high resolution, digital art, 3D rendering, photorealistic quality, fine details, smooth textures, fantasy style, ethereal mood, minimalist elegance, tranquil atmosphere, oriental aesthetic, ink painting influence, watercolor effect, artistic interpretation>
# Prompt 输出格式
主题内容：
场景特征：
环境光照：
画幅视角：
画面质量：
画面风格：
# Prompt 限制
1. 严格按照参照 Prompt 输出格式
2. 内容按照主题内容，场景特征，环境光照，画幅视角，画面质量，画面风格的顺序来描述
3. 使用英文半角","做分隔符
4. 输出内容必须是英文

[IMPORTANT TECHNICAL INSTRUCTION]
Based on your analysis using the above persona, format your output STRICTLY as the following JSON object. Do not output markdown code blocks.
{
  "aiUnderstanding": "A detailed English description of the image content.",
  "subject": { "en": "English tags for Subject Content", "cn": "Chinese translation of tags" },
  "scene": { "en": "English tags for Scene Features", "cn": "Chinese translation" },
  "lighting": { "en": "English tags for Lighting", "cn": "Chinese translation" },
  "perspective": { "en": "English tags for Perspective", "cn": "Chinese translation" },
  "quality": { "en": "English tags for Quality", "cn": "Chinese translation" },
  "style": { "en": "English tags for Style", "cn": "Chinese translation" }
}
`;

      let jsonStr = "";

      if (apiProvider === 'openai') {
         jsonStr = await callOpenAI(base64, prompt, mimeType);
      } else {
         const response = await ai.models.generateContent({
           model: modelName,
           config: { responseMimeType: "application/json" },
           contents: {
             parts: [
               { inlineData: { mimeType: mimeType, data: base64 } },
               { text: prompt }
             ]
           }
         });
         jsonStr = response.text || "{}";
      }

      // Clean JSON if markdown block
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const result = JSON.parse(jsonStr);

      const newMeta: ImageMetadata = {
        triggerWord: img.metadata?.triggerWord || '',
        aiUnderstanding: result.aiUnderstanding || '',
        subject: result.subject || { en: '', cn: '' },
        scene: result.scene || { en: '', cn: '' },
        lighting: result.lighting || { en: '', cn: '' },
        perspective: result.perspective || { en: '', cn: '' },
        quality: result.quality || { en: '', cn: '' },
        style: result.style || { en: '', cn: '' },
      };

      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        isGenerating: false, 
        metadata: newMeta,
        caption: integrateCaption(i, newMeta)
      } : i));

    } catch (e: any) {
      console.error(e);
      // alert(`生成失败: ${e.message}`); // Suppress alert in batch mode for better UX
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, isGenerating: false } : i));
    }
  };

  const generateAll = async () => {
    if (!apiKey) {
      onShowSettings();
      return;
    }
    setIsGenerating(true);

    // Identify images that need generation
    const targets = images.filter(img => !img.metadata?.subject?.en);
    
    const CONCURRENCY_LIMIT = 3;
    const executing: Promise<void>[] = [];

    for (const img of targets) {
       const p = generateAnalysis(img);
       executing.push(p);
       
       // Once promise resolves, remove from executing list
       p.then(() => executing.splice(executing.indexOf(p), 1));

       if (executing.length >= CONCURRENCY_LIMIT) {
         await Promise.race(executing);
       }
    }

    // Wait for remaining tasks
    await Promise.all(executing);
    
    setIsGenerating(false);
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b flex justify-between items-center shrink-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-gray-600">全局触发词:</span>
             <input 
               type="text" 
               value={globalTrigger}
               onChange={(e) => setGlobalTrigger(e.target.value)}
               className="border rounded px-2 py-1.5 text-sm w-40 focus:ring-2 focus:ring-primary outline-none"
               placeholder="例如: sks, girl"
             />
             <button 
               onClick={applyGlobalTrigger}
               className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition-colors"
             >
               应用
             </button>
          </div>
        </div>
        
        <button 
          onClick={generateAll}
          disabled={isGenerating}
          className={`px-4 py-2 rounded text-white text-sm font-medium shadow-sm flex items-center gap-2 transition-all ${
            isGenerating ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              正在生成...
            </>
          ) : (
            <>
              <IconMagic />
              AI 批量生成
            </>
          )}
        </button>
      </div>

      {/* Multidimensional Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse text-sm relative">
          {/* 
             Z-Index Strategy:
             - Corner Headers (Sticky Top + Left/Right): z-50
             - Normal Headers (Sticky Top): z-40
             - Sticky Columns (Body Left/Right): z-30
             - Normal Body Cells: z-0
          */}
          <thead>
            <tr>
              {/* Fixed Columns (Left) */}
              <HeaderCell title="#" width={`w-[${WIDTH_INDEX}px]`} fixed left={LEFT_INDEX} bgColor="bg-[#F5F6F7]" noBorderRight />
              <HeaderCell icon={IconImage} title="图片" width={`w-[${WIDTH_IMAGE}px]`} fixed left={LEFT_IMAGE} bgColor="bg-[#F5F6F7]" noBorderRight />
              <HeaderCell icon={IconLock} title="整合后 (Caption)" width={`w-[${WIDTH_CAPTION}px]`} fixed left={LEFT_CAPTION} bgColor="bg-[#F5F6F7]" isAi />
              
              {/* Scrollable Columns */}
              <HeaderCell icon={IconText} title="触发词" width="w-32" />
              <HeaderCell icon={IconText} title="AI 图像理解 (EN)" width="w-64" isAi />

              {/* Metadata Columns Loop */}
              {METADATA_COLUMNS.map((col) => (
                 <React.Fragment key={col.key}>
                    <HeaderCell 
                      icon={IconText} 
                      title={`${col.label}提取`} 
                      width={col.width} 
                      bgColor={col.bgHeader}
                      isAi 
                    />
                    <HeaderCell 
                      icon={IconText} 
                      title={`${col.label}翻译`} 
                      width={col.width} 
                      bgColor={col.bgHeader}
                      isAi 
                    />
                 </React.Fragment>
              ))}
              
              {/* Fixed Column (Right) */}
              <HeaderCell title="操作" width="w-20" fixed right={0} bgColor="bg-[#F5F6F7]" />
            </tr>
          </thead>
          <tbody>
            {images.map((img, index) => (
              <tr key={img.id} className="hover:bg-gray-50 group">
                {/* Sticky Left Cells (z-30) */}
                <td className="border-b bg-white text-center text-gray-500 sticky z-30" style={{ left: LEFT_INDEX, minWidth: WIDTH_INDEX, maxWidth: WIDTH_INDEX }}>{index + 1}</td>
                <td className="border-b p-1 sticky bg-white z-30" style={{ left: LEFT_IMAGE, minWidth: WIDTH_IMAGE, maxWidth: WIDTH_IMAGE }}>
                  <img src={img.croppedUrl || img.previewUrl} className="w-16 h-16 object-contain mx-auto" alt="" />
                </td>
                <td className="border-b border-r p-0 sticky bg-white z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ left: LEFT_CAPTION, minWidth: WIDTH_CAPTION, maxWidth: WIDTH_CAPTION }}>
                  <div className="relative h-full">
                    <textarea 
                      value={img.caption}
                      readOnly
                      className="w-full h-full p-2 resize-none outline-none bg-transparent text-gray-600 min-h-[80px]" 
                    />
                  </div>
                </td>

                <TableCell>
                  <input 
                    type="text" 
                    value={img.metadata?.triggerWord || ''}
                    onChange={(e) => updateMetadata(img.id, 'triggerWord', e.target.value)}
                    className="w-full h-full px-2 outline-none bg-transparent"
                    placeholder=""
                  />
                </TableCell>

                <TableCell>
                  <LoadingOverlay isGenerating={img.isGenerating} />
                  <textarea 
                    value={img.metadata?.aiUnderstanding || ''}
                    readOnly
                    className="w-full h-full p-2 resize-none outline-none bg-transparent"
                    placeholder="等待生成..."
                  />
                </TableCell>

                {/* Metadata Cells */}
                {METADATA_COLUMNS.map(col => (
                  <React.Fragment key={col.key}>
                    {/* Extraction (EN) */}
                    <TableCell bgColor={col.bgCell}>
                       <LoadingOverlay isGenerating={img.isGenerating} />
                       <textarea
                         // @ts-ignore
                         value={img.metadata?.[col.key]?.en || ''}
                         onChange={(e) => updateMetadata(img.id, `${col.key}.en`, e.target.value)}
                         className="w-full h-full p-2 resize-none outline-none bg-transparent font-mono text-xs leading-relaxed"
                       />
                    </TableCell>
                    {/* Translation (CN) */}
                    <TableCell bgColor={col.bgCell}>
                       <LoadingOverlay isGenerating={img.isGenerating} />
                       <textarea
                         // @ts-ignore
                         value={img.metadata?.[col.key]?.cn || ''}
                         onChange={(e) => updateMetadata(img.id, `${col.key}.cn`, e.target.value)}
                         className="w-full h-full p-2 resize-none outline-none bg-transparent text-xs text-gray-600"
                       />
                    </TableCell>
                  </React.Fragment>
                ))}

                {/* Sticky Right Cell (z-30) */}
                <td className="border-b border-l border-gray-200 p-2 text-center bg-white sticky right-0 z-30 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.15)]">
                  <button 
                    onClick={() => generateAnalysis(img)}
                    className="text-xs font-medium px-3 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 whitespace-nowrap"
                  >
                    {img.isGenerating ? '...' : '生成'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function HeaderCell({ 
  icon: Icon, title, width, fixed, left, right, bgColor = 'bg-[#F5F6F7]', isAi, noBorderRight 
}: { 
  icon?: React.FC, title: string, width: string, fixed?: boolean, left?: number, right?: number, bgColor?: string, isAi?: boolean, noBorderRight?: boolean 
}) {
  return (
    <th 
      className={`px-3 py-2 text-left font-medium text-gray-600 border-b ${noBorderRight ? '' : 'border-r'} ${fixed && right === 0 ? 'border-l border-gray-200' : ''} text-xs whitespace-nowrap h-10 box-border sticky top-0 ${width} ${bgColor} ${fixed ? 'z-50' : 'z-40'}`}
      style={fixed ? { left: left !== undefined ? left : undefined, right: right !== undefined ? right : undefined } : {}}
    >
      {/* If sticky right, add shadow separator on the left side */}
      {right === 0 && <div className="absolute inset-y-0 left-0 w-px shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.2)]" />}
      
      <div className="flex items-center gap-1.5">
        {Icon && <Icon />}
        {title}
        {isAi && <span className="px-1 py-0.5 bg-purple-100 text-purple-600 text-[10px] rounded">AI 生成</span>}
      </div>
    </th>
  );
}

function TableCell({ children, bgColor = 'bg-white' }: { children?: React.ReactNode, bgColor?: string }) {
  return (
    <td className={`border-b border-r p-0 h-24 relative min-w-[150px] align-top ${bgColor}`}>
      {children}
    </td>
  );
}

function LoadingOverlay({ isGenerating }: { isGenerating: boolean }) {
  if (!isGenerating) return null;
  return (
    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
