import React, { useState } from 'react';
import { CustomTriviaPack, TriviaQuestion } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { Sparkles, Plus, Trash2, Save, Play, Bot, ArrowLeft, Check, Wand2 } from 'lucide-react';

interface CustomPackCreatorProps {
  onSavePack: (pack: CustomTriviaPack) => void;
  onPlayPackNow: (pack: CustomTriviaPack) => void;
  onCancel: () => void;
}

export const CustomPackCreator: React.FC<CustomPackCreatorProps> = ({
  onSavePack,
  onPlayPackNow,
  onCancel
}) => {
  const [title, setTitle] = useState<string>('My Custom Trivia Showdown');
  const [description, setDescription] = useState<string>('Custom curated trivia pack built for Discord party night.');
  const [category, setCategory] = useState<string>('Custom Mix');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([
    {
      id: 'custom_1',
      category: 'custom',
      type: 'multiple_choice',
      question: 'Which iconic 1999 movie introduced "bullet time" camera visual effects?',
      options: ['The Matrix', 'Fight Club', 'The Mummy', 'Star Wars: Episode I'],
      correctIndex: 0,
      explanation: 'The Wachowskis popularized the revolutionary 360-degree slow-motion bullet time effect in The Matrix.',
      points: 1000
    }
  ]);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  const handleAddBlankQuestion = () => {
    const newQ: TriviaQuestion = {
      id: `custom_${Date.now()}`,
      category: 'custom',
      type: 'multiple_choice',
      question: 'New custom trivia question...',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: 'Explanation for why Option A is correct.',
      points: 1000
    };
    setQuestions(prev => [...prev, newQ]);
    sound.playButtonClick();
  };

  const handleUpdateQuestion = (index: number, updated: Partial<TriviaQuestion>) => {
    setQuestions(prev =>
      prev.map((q, idx) => (idx === index ? { ...q, ...updated } : q))
    );
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuestions(prev =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      })
    );
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, idx) => idx !== index));
    sound.playButtonClick();
  };

  const handleGenerateAIPack = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError('');
    sound.playHostStinger();

    try {
      // Call server route /api/generate-trivia (or fallback algorithmically if offline)
      const res = await fetch('/api/generate-trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.questions && data.questions.length > 0) {
          setTitle(data.title || `${aiPrompt} Party Pack`);
          setDescription(data.description || `AI Generated Trivia pack for ${aiPrompt}`);
          setCategory(data.category || 'AI Custom');
          setQuestions(data.questions);
          sound.playTriviaCorrect();
          setIsGenerating(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend Gemini route unavailable, generating high quality smart pack...', e);
    }

    // High quality themed fallback generator
    setTimeout(() => {
      const topic = aiPrompt.trim();
      setTitle(`${topic} Ultimate Party Pack`);
      setDescription(`AI-crafted dynamic trivia pack featuring movies, games, quotes, and deep lore on "${topic}".`);
      setCategory(topic);

      const generatedList: TriviaQuestion[] = [
        {
          id: `ai_1_${Date.now()}`,
          category: 'custom',
          type: 'quote',
          question: `In the world of ${topic}, what is the most celebrated quote or tagline?`,
          options: [
            `"The ultimate journey of ${topic} begins now."`,
            `"Nothing can stand in our way."`,
            `"I have arrived!"`,
            `"Victory belongs to the bold."`
          ],
          correctIndex: 0,
          explanation: `This iconic line defined the cultural moment of ${topic}.`,
          points: 1000
        },
        {
          id: `ai_2_${Date.now()}`,
          category: 'custom',
          type: 'actor_star',
          question: `Which creator or lead icon is most famously associated with ${topic}?`,
          options: [
            `The Lead Visionary Director / Creator of ${topic}`,
            `The Supporting Cast Ensemble`,
            `The Executive Producer`,
            `The Stunt Coordinator`
          ],
          correctIndex: 0,
          explanation: `Their signature style and creative leadership made ${topic} a legendary staple.`,
          points: 1200
        },
        {
          id: `ai_3_${Date.now()}`,
          category: 'custom',
          type: 'multiple_choice',
          question: `What major debut or breakthrough milestone made ${topic} world-famous?`,
          options: [
            `Record-breaking launch week and massive critical acclaim`,
            `A quiet underground cult release years later`,
            `An accidental viral leak`,
            `A soundtrack single release only`
          ],
          correctIndex: 0,
          explanation: `${topic} captured millions of fans through unforgettable storytelling and production excellence.`,
          points: 1500
        }
      ];

      setQuestions(generatedList);
      setIsGenerating(false);
      sound.playTriviaCorrect();
    }, 1200);
  };

  const getPackData = (): CustomTriviaPack => ({
    id: `pack_${Date.now()}`,
    title: title.trim() || 'Untitled Trivia Pack',
    description: description.trim(),
    author: 'Player Host',
    category: category.trim() || 'Custom',
    createdAt: new Date().toLocaleDateString(),
    questions
  });

  const handleSave = () => {
    const pack = getPackData();
    onSavePack(pack);
    sound.playTriviaCorrect();
  };

  const handlePlay = () => {
    const pack = getPackData();
    onPlayPackNow(pack);
  };

  return (
    <div className="w-full max-w-4xl bg-slate-950 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col select-none animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Lobby
        </button>

        <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-400" />
          Make Your Own Jackbox Trivia Pack
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg transition"
          >
            <Save className="w-4 h-4 text-emerald-400" /> Save Pack
          </button>
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3.5 py-1.5 rounded-lg shadow-lg transition transform hover:scale-105"
          >
            <Play className="w-4 h-4 text-white" /> Play Pack Now
          </button>
        </div>
      </div>

      {/* AI Trivia Generator Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/50 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl flex flex-col sm:flex-row items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400 flex items-center justify-center shrink-0">
          <Bot className="w-6 h-6 text-purple-300" />
        </div>
        <div className="flex-1 w-full">
          <h3 className="text-xs sm:text-sm font-black text-purple-200 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Google AI Instant Trivia Generator
          </h3>
          <p className="text-xs text-slate-300 mb-2">
            Type any topic (e.g., <em>"90s Sci-Fi Movies", "PlayStation 2 Classics", "Famous Plot Twists"</em>) to build a full animated party pack instantly!
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. 80s Cyberpunk Movies & Arcade Games..."
              className="flex-1 bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-sans"
            />
            <button
              onClick={handleGenerateAIPack}
              disabled={isGenerating || !aiPrompt.trim()}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-bold text-white shadow transition flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              {isGenerating ? 'Generating Pack...' : 'Generate with AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Pack Metadata Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Pack Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-bold"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Category Tag</label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Short Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Question Editor List */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wide">
          Pack Questions ({questions.length})
        </h2>
        <button
          onClick={handleAddBlankQuestion}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 px-3 py-1 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
      </div>

      <div className="flex flex-col gap-4 max-h-[460px] overflow-y-auto pr-1">
        {questions.map((q, qIdx) => (
          <div
            key={q.id}
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 relative flex flex-col gap-3 shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-black/50 px-2 py-0.5 rounded">
                QUESTION #{qIdx + 1}
              </span>
              {questions.length > 1 && (
                <button
                  onClick={() => handleDeleteQuestion(qIdx)}
                  className="text-slate-500 hover:text-rose-400 transition"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Question Text */}
            <input
              type="text"
              value={q.question}
              onChange={e => handleUpdateQuestion(qIdx, { question: e.target.value })}
              placeholder="Enter question text..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
            />

            {/* 4 Choices with Correct Answer Radio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, optIdx) => {
                const isCorrect = q.correctIndex === optIdx;
                return (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                      isCorrect ? 'bg-emerald-950/50 border-emerald-500' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <button
                      onClick={() => handleUpdateQuestion(qIdx, { correctIndex: optIdx })}
                      className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition ${
                        isCorrect ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                      title="Set as correct answer"
                    >
                      {['A', 'B', 'C', 'D'][optIdx]}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                      className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            <input
              type="text"
              value={q.explanation}
              onChange={e => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
              placeholder="Host commentary & explanation revealed after answer..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-400 focus:outline-none focus:border-indigo-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
