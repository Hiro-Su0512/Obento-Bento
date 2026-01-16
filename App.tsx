import React, { useState, useRef } from 'react';
import { Mode, AppState, ApiResponse, BentoItem } from './types';
import { generateBentoMenu, analyzeImage } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    mode: 'week',
    ingredients: '',
    grandma_vegetables: '',
    usual_ingredients: '卵, 醤油, 酒, みりん, 砂糖, 片栗粉, 油',
    loading: false,
    result: null,
    error: null,
  });

  const [analyzingField, setAnalyzingField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFieldRef = useRef<'ingredients' | 'grandma_vegetables' | null>(null);

  // -------------------------------
  // API呼び出し部分はgemini.service.tsへ
  // APIキーは環境変数から取得
  // .env に以下を置く
  // VITE_GEMINI_API_KEY=ここにあなたのAPIキー
  // -------------------------------

  const handleGenerate = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await generateBentoMenu(
        state.mode,
        state.ingredients,
        state.grandma_vegetables,
        state.usual_ingredients
      );
      setState(prev => ({ ...prev, result, loading: false }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: '献立の生成に失敗しました。', loading: false }));
    }
  };

  const onCameraClick = (field: 'ingredients' | 'grandma_vegetables') => {
    activeFieldRef.current = field;
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const field = activeFieldRef.current;
    if (!file || !field) return;

    setAnalyzingField(field);
    
    try {
      const base64 = await fileToBase64(file);
      const cleanedBase64 = base64.split(',')[1];
      const result = await analyzeImage(
        cleanedBase64,
        file.type,
        field === 'ingredients' ? 'receipt' : 'food'
      );
      
      setState(prev => ({
        ...prev,
        [field]: prev[field] ? `${prev[field]}, ${result}` : result
      }));
    } catch (err) {
      console.error(err);
      alert('画像の解析に失敗しました。');
    } finally {
      setAnalyzingField(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const isPreShopping = !state.ingredients && !state.grandma_vegetables;

  // 以下、元のApp.tsxのUI・表示部分はそのまま
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* ここからUIコード（textarea, button, 結果表示など） */}
      {/* ...省略... */}
      <footer className="mt-12 text-center text-gray-400 text-xs pb-12">
        <p>© 2024 Bento Bento Assistant for Busy Moms</p>
        <p className="mt-1">Powered by Gemini Pro</p>
      </footer>
    </div>
  );
};

export default App;
