import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend 
} from 'recharts';
import { 
  Search, Filter, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, 
  LayoutDashboard, Table as TableIcon, BarChart3, Info, Upload, RotateCcw
} from 'lucide-react';

// Initial default data
const defaultData = {
  "items": [
    {
      "category": "1.Технічні характеристики",
      "question": "230 буд Яка товщина стяжки?",
      "gold-answer": "80 мм",
      "variations": [
        { "question": "Для будинку 230 яка передбачена товщина стяжки?", "answer": "Товщина стяжки в будинку 230 — 80 мм.", "generation-quality": 100 },
        { "question": "Якої товщини стяжка в буд. 230 (чорнова підлога)?", "answer": "Стяжка: 80 мм.", "generation-quality": 100 },
        { "question": "Підкажіть, товщина стяжки у квартирах будинку 230 — скільки мм?", "answer": "У буд. 230 передбачено 80 мм стяжки.", "generation-quality": 100 },
        { "question": "Буд. 230: скільки сантиметрів/міліметрів стяжки закладається?", "answer": "Закладена товщина стяжки — 80 мм.", "generation-quality": 100 },
        { "question": "У проєкті будинку 230 яка товщина цементної стяжки?", "answer": "Товщина цементної стяжки — 80 мм.", "generation-quality": 100 }
      ]
    },
    {
      "category": "1.Технічні характеристики",
      "question": "230 буд Який утеплювач використовуємо?",
      "gold-answer": "Мінеральна вата",
      "variations": [
        { "question": "Буд. 230: який утеплювач використовується (фасад/огороджувальні конструкції)?", "answer": "Використовуємо мінеральну вату.", "generation-quality": 90 },
        { "question": "Який тип утеплення закладено для будинку 230?", "answer": "Утеплювач — мінеральна вата.", "generation-quality": 100 }
      ]
    },
    {
      "category": "Басейн РА",
      "question": "Яка кількість шезлонгів?",
      "gold-answer": "132 шт",
      "variations": [
        { "question": "У зоні басейну (РА) яка кількість шезлонгів передбачена?", "answer": "Передбачено 132 шезлонги.", "generation-quality": 98 },
        { "question": "Скільки шезлонгів буде біля басейну?", "answer": "Кількість шезлонгів — 132 шт.", "generation-quality": 100 }
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

  // Score styling logic
  const getScoreInfo = (score) => {
    if (score >= 95) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hex: '#10b981' };
    if (score >= 90) return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', hex: '#3b82f6' };
    if (score >= 80) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', hex: '#f59e0b' };
    return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', hex: '#ef4444' };
  };

  // Data processing logic
  const processedData = useMemo(() => {
    let allVariations = [];
    const categoryStats = {};

    if (!data || !data.items) return { allVariations: [], categories: [], globalAvg: 0, items: [] };

    data.items.forEach(item => {
      const avgQuality = item.variations.length > 0 
        ? item.variations.reduce((acc, v) => acc + (v['generation-quality'] || 0), 0) / item.variations.length 
        : 0;
      
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { name: item.category, totalScore: 0, count: 0, questions: 0 };
      }
      
      categoryStats[item.category].totalScore += avgQuality;
      categoryStats[item.category].questions += 1;
      categoryStats[item.category].count += 1;

      item.variations.forEach(v => {
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

    // Distribution data for Pie Chart
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

  // File Upload Handlers
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.items || !Array.isArray(json.items)) {
          throw new Error("Невірний формат JSON: очікувався масив 'items'.");
        }
        setData(json);
        setUploadError(null);
        setExpandedItems({});
        setSearchTerm('');
        setSelectedCategory('All');
      } catch (err) {
        setUploadError("Помилка при читанні файлу: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const resetData = () => { setData(defaultData); setUploadError(null); };
  const toggleExpand = (index) => setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">RAG Quality Analytics</h1>
            <p className="text-slate-500 mt-1">Звітність по генерації відповідей на основі RAG сховища</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <button 
                onClick={triggerFileInput}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all font-medium text-sm"
              >
                <Upload size={16} /> Завантажити JSON
              </button>
              <button 
                onClick={resetData}
                title="Скинути до стандартних даних"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm ${activeTab === 'summary' ? 'bg-slate-800 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <LayoutDashboard size={16} /> Підсумок
              </button>
              <button 
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm ${activeTab === 'details' ? 'bg-slate-800 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <TableIcon size={16} /> Деталі
              </button>
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-in fade-in duration-300">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'summary' ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm font-medium mb-1">Середня якість</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-800">{processedData.globalAvg}%</span>
                  <CheckCircle2 className="text-emerald-500" size={20} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm font-medium mb-1">Запитань</p>
                <p className="text-4xl font-bold text-slate-800">{processedData.items.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm font-medium mb-1">Варіацій</p>
                <p className="text-4xl font-bold text-slate-800">{processedData.allVariations.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm font-medium mb-1">Категорій</p>
                <p className="text-4xl font-bold text-slate-800">{processedData.categories.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><BarChart3 size={20} className="text-indigo-500" /> Якість за категоріями (%)</h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData.categories} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [`${value}%`, 'Середній бал']}
                      />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={24}>
                        {processedData.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getScoreInfo(entry.avg).hex} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribution Pie with Specific Colors */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Info size={20} className="text-indigo-500" /> Розподіл оцінок (за варіаціями)</h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedData.pieChartData}
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {processedData.pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={40} 
                        iconType="circle"
                        formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Пошук за питанням або категорією..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={18} className="text-slate-500" />
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none text-sm text-slate-600 font-medium"
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
            <div className="space-y-4 pb-12">
              {filteredItems.map((item, idx) => {
                const avg = item.variations.length > 0 
                  ? Math.round(item.variations.reduce((acc, v) => acc + (v['generation-quality'] || 0), 0) / item.variations.length)
                  : 0;
                const scoreStyle = getScoreInfo(avg);
                const isExpanded = expandedItems[idx];
                
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                    <div 
                      className="p-4 md:p-6 cursor-pointer flex items-center justify-between gap-4"
                      onClick={() => toggleExpand(idx)}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {item.category}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${scoreStyle.color} ${scoreStyle.bg} ${scoreStyle.border}`}>
                            Avg: {avg}%
                          </span>
                        </div>
                        <h4 className="text-base md:text-lg font-semibold text-slate-800 leading-snug">{item.question}</h4>
                        <div className="text-slate-500 text-xs md:text-sm flex items-start gap-1 italic line-clamp-1">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> 
                          <span className="truncate">Gold: {item['gold-answer']}</span>
                        </div>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-6 animate-in slide-in-from-top-2 duration-200">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Варіації запитів</h5>
                        <div className="space-y-4">
                          {item.variations.map((v, vIdx) => {
                             const vStyle = getScoreInfo(v['generation-quality']);
                             return (
                               <div key={vIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                 <div className={`absolute left-0 top-0 bottom-0 w-1`} style={{ backgroundColor: vStyle.hex }}></div>
                                 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                   <div className="space-y-3 flex-1">
                                     <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Змінене питання</p>
                                       <p className="text-slate-700 font-medium text-sm">{v.question}</p>
                                     </div>
                                     <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Відповідь AI (RAG)</p>
                                       <p className="text-slate-600 bg-slate-50 p-2 rounded border border-dashed border-slate-200 text-sm whitespace-pre-wrap">{v.answer}</p>
                                     </div>
                                   </div>
                                   <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start min-w-[80px]">
                                     <div className={`text-xl font-black`} style={{ color: vStyle.hex }}>
                                       {v['generation-quality']}%
                                     </div>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Якість</p>
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

              {filteredItems.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                  <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium text-lg">Нічого не знайдено за вашим запитом</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
        <p>AI Quality Dashboard • На основі {processedData.allVariations.length} тест-кейсів</p>
      </footer>
    </div>
  );
};

export default App;
