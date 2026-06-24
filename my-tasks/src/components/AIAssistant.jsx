import React, { useState, useRef, useEffect } from 'react';
import { useAi } from '../hooks/useAi';
import { showToast } from './Toast';

export default function AIAssistant({ onNavigateToNote }) {
  const { status, messages, isLoading, ask, expandThought, clearMessages, cancel, loadStatus } = useAi();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('ask');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');

    if (mode === 'expand') {
      const note = await expandThought(q);
      if (note && onNavigateToNote) {
        onNavigateToNote(note.id);
      }
    } else {
      await ask(q);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSourceClick = (source) => {
    if (source.id && onNavigateToNote) {
      onNavigateToNote(source.id);
    }
  };

  const isReady = status.ready;

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h2>AI Ассистент</h2>
        <div className="ai-status">
          <span className={`ai-status-dot ${isReady ? 'ready' : 'offline'}`}></span>
          <span className="ai-status-text">
            {isReady ? `${status.model} (Ollama)` : 'Модель не загружена'}
          </span>
          <button className="ai-reconnect-btn" onClick={loadStatus} title="Проверить статус">↻</button>
        </div>
      </div>

      <div className="ai-chat">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-icon">✦</div>
            <p>Задай вопрос по своим заметкам или попроси развернуть мысль.</p>
            <div className="ai-hints">
              <button className="ai-hint-btn" onClick={() => { setMode('ask'); ask('Что такое Nox?'); }}>«Что такое Nox?»</button>
              <button className="ai-hint-btn" onClick={() => { setMode('expand'); expandThought('AI агент для задач').then(note => { if (note?.id && onNavigateToNote) onNavigateToNote(note.id); }); }}>«Разверни: AI агент для задач»</button>
              <button className="ai-hint-btn" onClick={() => { setMode('ask'); ask('Найди в интернете последние новости'); }}>«Найди в интернете последние новости»</button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.role} ${msg.type || ''}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className="ai-message-content">
              <div className="ai-message-text">{renderMessageContent(msg)}</div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="ai-sources">
                  <span className="ai-sources-label">Источники:</span>
                  {msg.sources.map((s, j) => (
                    <button
                      key={j}
                      className="ai-source-link"
                      onClick={() => handleSourceClick(s)}
                    >
                      {s.title || s.url || `Источник ${j + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {msg.note && (
                <div className="ai-note-created">
                  <button
                    className="ai-note-link"
                    onClick={() => onNavigateToNote?.(msg.note.id)}
                  >
                    ✦ {msg.note.title}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">AI</div>
            <div className="ai-message-content">
              <div className="ai-typing">
                <span className="ai-typing-dot"></span>
                <span className="ai-typing-dot"></span>
                <span className="ai-typing-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area">
        <div className="ai-mode-toggle">
          <button
            className={`ai-mode-btn ${mode === 'ask' ? 'active' : ''}`}
            onClick={() => setMode('ask')}
          >
            Спросить
          </button>
          <button
            className={`ai-mode-btn ${mode === 'expand' ? 'active' : ''}`}
            onClick={() => setMode('expand')}
          >
            Развернуть мысль
          </button>
        </div>
        <div className="ai-input-row">
          <input
            ref={inputRef}
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'ask' ? 'Спроси о чём угодно...' : 'Введи мысль для развёртки...'}
            disabled={!isReady || isLoading}
          />
          {isLoading ? (
            <button className="ai-stop-btn" onClick={cancel}>
              ■
            </button>
          ) : (
            <button
              className="ai-send-btn"
              onClick={handleSubmit}
              disabled={!input.trim() || !isReady}
            >
              {mode === 'expand' ? '✦' : '→'}
            </button>
          )}
        </div>
        <button className="ai-clear-btn" onClick={clearMessages}>
          Очистить диалог
        </button>
      </div>
    </div>
  );
}

function renderMessageContent(msg) {
  if (msg.type === 'note_created') return msg.content;

  let text = msg.content || '';
  text = text.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
    return `<span class="ai-wiki-link">${title}</span>`;
  });

  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}
