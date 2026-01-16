
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
      const result = await analyzeImage(cleanedBase64, file.type, field === 'ingredients' ? 'receipt' : 'food');
      
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

  const RenderDishList = ({ items }: { items: BentoItem[] }) => (
    <div className="flex flex-col gap-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center group">
          <span className="text-gray-800 font-medium mr-2">• {item.name}</span>
          <a 
            href={item.recipeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-600 transition-colors text-xs flex items-center bg-orange-50 px-2 py-0.5 rounded border border-orange-100 opacity-80 group-hover:opacity-100 shrink-0"
          >
            <i className="fa-solid fa-up-right-from-square mr-1 text-[10px]"></i>
            レシピ
          </a>
        </div>
      ))}
    </div>
  );

  const BentoPointBubble = ({ text }: { text: string }) => (
    <div className="relative mb-4 animate-in zoom-in duration-300">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2 text-orange-800 text-sm font-bold flex items-center">
        <i className="fa-solid fa-comment-dots mr-2 text-orange-400"></i>
        <span>{text}</span>
      </div>
      <div className="absolute -bottom-1 left-6 w-2 h-2 bg-orange-50 border-r border-b border-orange-200 transform rotate-45"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Hidden File Input for Camera */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleImageChange}
      />

      {/* Header */}
      <header className="text-center mb-8">
        <div className="inline-block p-3 bg-orange-400 rounded-full mb-4 shadow-lg">
          <i className="fa-solid fa-utensils text-white text-3xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-orange-800 tracking-tight">
          お弁当献立アシスタント
        </h1>
        <p className="text-orange-600 mt-2">
          忙しいママのための、平日5日分お弁当レシピ提案
        </p>
      </header>

      {/* Main Form */}
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden p-6 mb-8 border border-orange-100">
        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="flex bg-orange-50 p-1 rounded-xl">
            <button
              onClick={() => setState(prev => ({ ...prev, mode: 'week' }))}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                state.mode === 'week' 
                  ? 'bg-orange-500 text-white shadow-md scale-105' 
                  : 'text-orange-400 hover:bg-orange-100'
              }`}
            >
              <i className="fa-solid fa-calendar-week mr-2"></i>
              平日5日分
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, mode: 'five' }))}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                state.mode === 'five' 
                  ? 'bg-orange-500 text-white shadow-md scale-105' 
                  : 'text-orange-400 hover:bg-orange-100'
              }`}
            >
              <i className="fa-solid fa-lightbulb mr-2"></i>
              献立案5つ
            </button>
          </div>

          {/* Info Banner for Pre-Shopping */}
          {isPreShopping && state.mode === 'week' && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-700 text-sm flex items-start">
              <i className="fa-solid fa-circle-info mt-1 mr-3"></i>
              <p>食材が未入力です。「買い物前モード」として、おすすめのバランス献立（5品構成）と買い物リストを提案します。</p>
            </div>
          )}

          {/* Priority Vegetables (Grandma's) */}
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-gray-700">
                <i className="fa-solid fa-leaf text-green-500 mr-2"></i>
                おばあちゃんから届いた野菜
              </label>
              <button 
                onClick={() => onCameraClick('grandma_vegetables')}
                className="text-green-600 hover:text-green-700 text-sm font-bold flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100"
              >
                {analyzingField === 'grandma_vegetables' ? <i className="fa-solid fa-spinner fa-spin mr-1"></i> : <i className="fa-solid fa-camera mr-1"></i>}
                写真を撮る
              </button>
            </div>
            <textarea
              placeholder="例：キャベツ1玉、ほうれん草..."
              className="w-full p-4 rounded-xl bg-green-50 border border-green-100 focus:ring-2 focus:ring-green-400 outline-none transition-all h-24 text-gray-700"
              value={state.grandma_vegetables}
              onChange={(e) => setState(prev => ({ ...prev, grandma_vegetables: e.target.value }))}
            />
          </div>

          {/* Current Ingredients */}
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-gray-700">
                <i className="fa-solid fa-cart-shopping text-blue-500 mr-2"></i>
                手元にある食材・レシート
              </label>
              <button 
                onClick={() => onCameraClick('ingredients')}
                className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center bg-blue-50 px-3 py-1 rounded-full border border-blue-100"
              >
                {analyzingField === 'ingredients' ? <i className="fa-solid fa-spinner fa-spin mr-1"></i> : <i className="fa-solid fa-camera mr-1"></i>}
                レシート/写真を撮る
              </button>
            </div>
            <textarea
              placeholder="例：豚こま肉、鶏胸肉、卵、ちくわ..."
              className="w-full p-4 rounded-xl bg-blue-50 border border-blue-100 focus:ring-2 focus:ring-blue-400 outline-none transition-all h-24 text-gray-700"
              value={state.ingredients}
              onChange={(e) => setState(prev => ({ ...prev, ingredients: e.target.value }))}
            />
          </div>

          {/* Usual Ingredients */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fa-solid fa-box-open text-gray-500 mr-2"></i>
              常備している調味料・食材
            </label>
            <input
              type="text"
              placeholder="例：醤油、みりん、砂糖、片栗粉..."
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-gray-400 outline-none transition-all text-gray-700"
              value={state.usual_ingredients}
              onChange={(e) => setState(prev => ({ ...prev, usual_ingredients: e.target.value }))}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={state.loading || !!analyzingField}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center ${
              (state.loading || !!analyzingField) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {state.loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-3"></i>
                献立を考えています...
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles mr-3"></i>
                {isPreShopping && state.mode === 'week' ? '買い物前のおすすめ献立を作る' : '献立を生成する'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {state.error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-8 text-center">
          {state.error}
        </div>
      )}

      {state.result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          {state.mode === 'week' && state.result.weekData ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-orange-900 flex items-center px-2">
                <i className="fa-solid fa-calendar-check mr-3"></i>
                今週の平日お弁当スケジュール
              </h2>
              <div className="grid gap-8">
                {state.result.weekData.days.map((day, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl shadow-md border-l-8 border-orange-400 relative">
                    <div className="text-orange-500 font-bold mb-2 text-lg border-b border-orange-100 pb-2 flex justify-between items-center">
                      <span>{day.day}</span>
                    </div>

                    <BentoPointBubble text={day.point} />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-bold mr-2 uppercase tracking-wide">Main (2)</span>
                        </div>
                        <RenderDishList items={day.mains} />
                      </div>
                      
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-bold mr-2 uppercase tracking-wide">Side (3)</span>
                        </div>
                        <RenderDishList items={day.sides} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shopping List Section */}
              {state.result.weekData.shoppingList && state.result.weekData.shoppingList.length > 0 && (
                <div className="bg-blue-100 p-6 rounded-2xl border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
                    <i className="fa-solid fa-basket-shopping mr-3"></i>
                    今週の買い物リスト
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {state.result.weekData.shoppingList.map((item, idx) => (
                      <div key={idx} className="flex items-center bg-white/50 p-2 rounded-lg border border-blue-50">
                        <i className="fa-regular fa-square mr-3 text-blue-400"></i>
                        <span className="text-blue-800 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-orange-100 p-6 rounded-2xl border border-orange-200">
                <h3 className="font-bold text-orange-900 mb-4 flex items-center">
                  <i className="fa-solid fa-list-check mr-3"></i>
                  週末・前日の下準備リスト
                </h3>
                <ul className="space-y-2">
                  {state.result.weekData.prepList.map((item, idx) => (
                    <li key={idx} className="flex items-start text-orange-800">
                      <i className="fa-solid fa-check-circle mt-1 mr-3 text-orange-500"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : state.mode === 'five' && state.result.fiveData ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-orange-900 flex items-center px-2">
                <i className="fa-solid fa-lightbulb mr-3"></i>
                おすすめ献立案 5選
              </h2>
              <div className="grid gap-6">
                {state.result.fiveData.map((idea, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl shadow-md border border-orange-100">
                    <div className="flex justify-between items-start mb-4 border-b border-orange-50 pb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{idea.name}</h3>
                        <p className="text-gray-500 text-sm italic mt-1">{idea.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        idea.makeAhead === '可' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        作り置き：{idea.makeAhead}
                      </span>
                    </div>

                    <BentoPointBubble text={idea.point} />

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wider flex items-center">
                          <i className="fa-solid fa-drumstick-bite mr-2"></i> 主菜
                        </div>
                        <RenderDishList items={idea.mains} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wider flex items-center">
                          <i className="fa-solid fa-carrot mr-2"></i> 副菜
                        </div>
                        <RenderDishList items={idea.sides} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-full mt-10 text-gray-400 text-sm hover:text-orange-500 flex items-center justify-center py-4"
          >
            <i className="fa-solid fa-arrow-up mr-2"></i>
            トップに戻る
          </button>
        </div>
      )}
      
      {/* Footer Info */}
      <footer className="mt-12 text-center text-gray-400 text-xs pb-12">
        <p>© 2024 Bento Bento Assistant for Busy Moms</p>
        <p className="mt-1">Powered by Gemini Pro</p>
      </footer>
    </div>
  );
};

export default App;
