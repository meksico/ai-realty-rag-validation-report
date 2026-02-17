import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend 
} from 'recharts';
import { 
  Search, Filter, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, 
  LayoutDashboard, Table as TableIcon, BarChart3, Info, Upload, RotateCcw,
  FileJson, Download
} from 'lucide-react';

// Початкові дані (можна залишити порожніми або як демо)
const defaultData = {
  "items": [
    {
      "category": "Технічні характеристики",
      "question": "Приклад: Яка товщина стяжки?",
      "gold-answer": "80 мм",
      "variations": [
        { "question": "Яка передбачена товщина стяжки?", "answer": "Товщина стяжки — 80 мм.", "generation-quality": 100 }
      ]
    }
  ]
};

const App = () => {
  const [data, setData] = useState(defaultData);
  const [activeTab, setActiveTab] = useState('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Встановлення заголовку сторінки
  useEffect(() => {
    document.title = "RAG Evaluation Dashboard";
  }, []);

  // Логіка стилізації балів (винесена для чистоти)
  const getScoreInfo = (score) => {
    if (score >= 95) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hex: '#10b981', label: 'Відмінно' };
    if (score >= 90) return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', hex: '#3b82f6', label: 'Добре' };
    if (score >= 80) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', hex: '#f59e0b', label: 'Задовільно' };
    return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', hex: '#ef4444', label: 'Низько' };
  };

  // Обробка даних (Мемоізація для швидкодії)
  const processedData = useMemo(() => {
    let allVariations = [];
    const categoryStats = {};

    if (!data?.items || !Array.isArray(data.items)) {
      return { allVariations: [], categories: [], globalAvg: 0, items: [], pieChartData: [] };
    }

    data.items.forEach(item => {
      const avgQuality = item.variations?.length > 0 
        ? item.variations.reduce((acc, v) => acc + (v['generation-quality'] || 0), 0) / item.variations.length 
        : 0;
      
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { name: item.category, totalScore: 0, count: 0, questions: 0 };
      }
      
      categoryStats[item.category].totalScore += avgQuality;
      categoryStats[item.category].questions += 1;
      categoryStats[item.category].count += 1;

      item.variations?.forEach(v => {
        allVariations.push({
          ...v,
          category: item.category,
          parentQuestion: item.question,
          goldAnswer: item['gold-answer']
        });
      });
    });

    const categories = Object.values(categoryStats).map(cat => ({
      name: cat.name,
      avg: Math.round(cat.totalScore / cat.count),
      count: cat.questions
    }));

    const globalAvg = allVariations.length > 0 
      ? Math.round(allVariations.reduce((acc, v) => acc + (v['generation-quality'] || 0), 0) / allVariations.length)
      : 0;

    const pieChartData = [
      { name: 'Відмінно (95-100)', value: allVariations.filter(v => v['generation-quality'] >= 95).length, color: '#10b981' },
      { name: 'Добре (90-94)', value: allVariations.filter(v => v['generation-quality'] >= 90 && v['generation-quality'] < 95).length, color: '#3b82f6' },
      { name: 'Задовільно (80-89)', value: allVariations.filter(v => v['generation-quality'] >= 80 && v['generation-quality'] < 90).length, color: '#f59e0b' },
      { name: 'Низько (<80)', value: allVariations.filter(v => v['generation-quality'] < 80).length, color: '#ef4444' }
    ].filter(segment => segment.value > 0);

    return { allVariations, categories, globalAvg, items: data.items, pieChartData };
  }, [data]);

  const filteredItems = useMemo(() => {
    return processedData.items.filter(item => {
      const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, processedData]);

  // Завантаження файлу
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.items || !Array.isArray(json.items)) throw new Error("JSON повинен містити масив 'items'");
        setData(json);
        setUploadError(null);
        setExpandedItems({});
        setSearchTerm('');
        setSelectedCategory('All');
      } catch (err) {
        setUploadError("Помилка: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const resetData = () => { setData(defaultData); setUploadError(null); };
  const toggleExpand = (index) => setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));

  // Компонент порожнього стану
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-200">
      <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
        <FileJson size={40} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Завантажте результати оцінювання</h3>
      <p className="text-slate-500 max-w-sm mb-8">
        Виберіть JSON файл зі структурою "items", щоб побачити аналітику якості відповідей вашої RAG-системи.
      </p>
      <button 
        onClick={triggerFileInput}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold"
      >
        <Upload size={20} /> Обрати файл
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10 selection:bg-indigo-100">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                <BarChart3 size={24} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">RAG Analytics</h1>
            </div>
            <p className="text-slate-500 font-medium">Дашборд оцінки якості генерації контенту</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={triggerFileInput}
                className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm transition-all font-bold text-sm"
              >
                <Upload size={18} className="text-indigo-500" /> Завантажити JSON
              </button>
              <button 
                onClick={resetData}
                title="Скинути"
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`px-5 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutDashboard size={18} /> Підсумок
              </button>
              <button 
                onClick={() => setActiveTab('details')}
                className={`px-5 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${activeTab === 'details' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <TableIcon size={18} /> Деталі
              </button>
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-bold">{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">Закрити</button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        {!data?.items || data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {activeTab === 'summary' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Середня якість', val: `${processedData.globalAvg}%`, icon: <CheckCircle2 className="text-emerald-500" />, sub: 'по всім запитам' },
                    { label: 'Всього тем', val: processedData.items.length, icon: <Info className="text-indigo-500" />, sub: 'базових питань' },
                    { label: 'Варіацій', val: processedData.allVariations.length, icon: <FileJson className="text-blue-500" />, sub: 'згенеровано тестів' },
                    { label: 'Категорій', val: processedData.categories.length, icon: <LayoutDashboard className="text-amber-500" />, sub: 'груп даних' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{s.label}</span>
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-4xl font-black text-slate-900 mb-1">{s.val}</p>
                        <p className="text-slate-400 text-xs font-medium">{s.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Category Chart */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-xl mb-8 flex items-center gap-3 text-slate-800">
                      <BarChart3 size={20} className="text-indigo-500" /> 
                      Якість за категоріями
                    </h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.categories} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc', radius: 8 }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                            formatter={(value) => [`${value}%`, 'Середній бал']}
                          />
                          <Bar dataKey="avg" radius={[0, 8, 8, 0]} barSize={28}>
                            {processedData.categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getScoreInfo(entry.avg).hex} fillOpacity={0.9} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Distribution Pie */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                    <h3 className="font-bold text-xl mb-8 flex items-center gap-3 text-slate-800 text-left">
                      <Info size={20} className="text-indigo-500" /> 
                      Загальний розподіл
                    </h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={processedData.pieChartData}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={6}
                            dataKey="value"
                            stroke="none"
                          >
                            {processedData.pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={50} 
                            iconType="circle"
                            formatter={(value) => <span className="text-xs font-bold text-slate-600 px-2">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Пошук запиту або теми..." 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter size={18} className="text-slate-400" />
                    <select 
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus:outline-none text-sm text-slate-600 font-bold cursor-pointer"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="All">Всі категорії</option>
                      {processedData.categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-4 pb-20">
                  {filteredItems.map((item, idx) => {
                    const avg = item.variations?.length > 0 
                      ? Math.round(item.variations.reduce((acc, v) => acc + (v['generation-quality'] || 0), 0) / item.variations.length)
                      : 0;
                    const scoreStyle = getScoreInfo(avg);
                    const isExpanded = expandedItems[idx];
                    
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div 
                          className="p-6 cursor-pointer flex items-center justify-between gap-6"
                          onClick={() => toggleExpand(idx)}
                        >
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-500">
                                {item.category}
                              </span>
                              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${scoreStyle.color} ${scoreStyle.bg} ${scoreStyle.border}`}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreStyle.hex }}></span>
                                Avg Score: {avg}%
                              </div>
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{item.question}</h4>
                            <div className="text-slate-400 text-sm flex items-start gap-2 italic">
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> 
                              <span className="line-clamp-1 font-medium">Gold Standard: {item['gold-answer']}</span>
                            </div>
                          </div>
                          <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}>
                            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-5 animate-in slide-in-from-top-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Тестові варіації ({item.variations?.length})</h5>
                            <div className="grid grid-cols-1 gap-4">
                              {item.variations?.map((v, vIdx) => {
                                 const vStyle = getScoreInfo(v['generation-quality']);
                                 return (
                                   <div key={vIdx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                     <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: vStyle.hex }}></div>
                                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                       <div className="space-y-4 flex-1">
                                         <div>
                                           <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Запит варіації</p>
                                           <p className="text-slate-800 font-bold text-sm leading-relaxed">{v.question}</p>
                                         </div>
                                         <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                                           <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Відповідь RAG</p>
                                           <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{v.answer}</p>
                                         </div>
                                       </div>
                                       <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start min-w-[100px]">
                                         <div className="text-3xl font-black italic" style={{ color: vStyle.hex }}>
                                           {v['generation-quality']}%
                                         </div>
                                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Якість</p>
                                         <span className={`mt-2 text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${vStyle.bg} ${vStyle.color}`}>
                                           {vStyle.label}
                                         </span>
                                       </div>
                                     </div>
                                   </div>
                                 );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto mt-20 pb-10 text-center">
         <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RAG Quality Framework v1.0</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Data Analysis Tool</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
