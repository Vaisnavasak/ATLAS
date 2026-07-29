import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Brain, Code, ShieldAlert } from 'lucide-react';
import type { AIChatMessage } from '../types';

interface AtlasChatProps {
  token: string | null;
}

export const AtlasChat: React.FC<AtlasChatProps> = ({ token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { sender: 'atlas', text: 'Hello! I am ATLAS, your AI-Driven Placement Assistant. 🌟 How can I help you today? Ask me to review your resume, generate mock interview questions, or check placement eligibility.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Append user message
    const newMsg: AIChatMessage = { sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to ATLAS API');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'atlas', text: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'atlas', text: '⚠️ Connection error. Please make sure the ATLAS backend server is running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '📝 Review Resume', text: 'Review my resume details, point out gaps, and suggest formatting optimizations.' },
    { label: '🧠 Mock Interview', text: 'Generate 3 custom technical and behavioral interview questions based on my skills.' },
    { label: '📊 Check Eligibility', text: 'Am I eligible for upcoming placements? Check my profile details.' },
    { label: '🚀 Certification Guides', text: 'Recommend certifications and learning resources for Web Development.' }
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-blue shadow-neon-cyan hover:scale-110 active:scale-95 transition-all z-40 text-slate-950 font-bold flex items-center gap-2 group"
      >
        <MessageSquare className="w-6 h-6 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-20 transition-all duration-300 ease-out whitespace-nowrap text-sm">
          ATLAS AI
        </span>
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] glass-panel rounded-2xl flex flex-col border border-cyber-cyan/30 shadow-2xl z-50 overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950/80 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyber-cyan/20">
                <Brain className="w-5 h-5 text-cyber-cyan" />
              </div>
              <div>
                <h3 className="font-semibold text-sm tracking-wide text-white">ATLAS ASSISTANT</h3>
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> ONLINE
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyber-purple to-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900/90 text-slate-100 border border-slate-800 rounded-tl-none font-sans whitespace-pre-line'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900/95 text-cyber-cyan border border-cyber-cyan/20 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" /> ATLAS is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40">
              <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-wider">Quick Suggestions:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.text)}
                    className="p-2 rounded-lg bg-slate-900/50 hover:bg-cyber-cyan/15 border border-slate-800 hover:border-cyber-cyan/30 text-left text-[11px] text-slate-300 transition-all font-sans"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Ask ATLAS anything..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-cyber-cyan text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue text-slate-950 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
