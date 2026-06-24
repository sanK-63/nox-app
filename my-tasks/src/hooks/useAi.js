import { useState, useEffect, useCallback, useRef } from 'react';
import { showToast } from '../components/Toast';

const OLLAMA_BASE = window.api?.ai ? 'http://localhost:11434' : '/ollama';
const MODEL = 'qwen2.5:3b';

async function ollamaFetch(method, body, signal) {
  const res = await fetch(`${OLLAMA_BASE}/api/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, stream: false, ...body }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  return res.json();
}

async function checkStatus() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.models?.some(m => m.name === MODEL) ?? false;
  } catch { return false; }
}

async function directChat(messages, options = {}, signal) {
  const data = await ollamaFetch('chat', {
    messages,
    options: { temperature: options.temperature ?? 0.3, num_predict: options.maxTokens ?? 4096 },
  }, signal);
  return data.message?.content || '';
}

function searchLocalNotes(query) {
  try {
    const saved = localStorage.getItem('notes');
    if (!saved) return [];
    const notes = JSON.parse(saved);
    const q = query.toLowerCase();
    return notes
      .filter(n => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      })
      .slice(0, 10)
      .map(n => ({ id: n.id, title: n.title, content: n.content }));
  } catch { return []; }
}

export function useAi() {
  const [status, setStatus] = useState({ available: false, ready: false, model: '', backend: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const isElectron = !!(window.api?.ai);
  const abortRef = useRef(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    if (isElectron) {
      window.__onAiStatus = (s) => { setStatus(s); };
    }
    return () => {
      clearInterval(interval);
      if (isElectron) window.__onAiStatus = null;
    };
  }, []);

  const loadStatus = async () => {
    try {
      if (isElectron) {
        const s = await window.api.ai.getStatus();
        setStatus(s);
      } else {
        const ok = await checkStatus();
        setStatus({ available: ok, ready: ok, model: MODEL, backend: 'ollama (browser)' });
      }
    } catch (e) {}
  };

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const ask = useCallback(async (query) => {
    if (!query.trim()) return null;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const userMsg = { role: 'user', content: query };
      setMessages(prev => [...prev, userMsg]);

      const answer = isElectron
        ? await window.api.ai.ask(query)
        : await (async () => {
            const matched = searchLocalNotes(query);
            let promptMsg;
            if (matched.length > 0) {
              const ctx = matched.map(n => `## ${n.title}\n\n${n.content}`).join('\n\n---\n\n');
              promptMsg = { role: 'user', content: `Вот заметки пользователя:\n\n${ctx}\n\n---\n\nВопрос: ${query}\n\nОтветь на вопрос, используя информацию из заметок. Если информации недостаточно — так и скажи.` };
            } else {
              promptMsg = { role: 'user', content: `Вопрос: ${query}\n\nВ твоих заметках не найдено информации об этом.` };
            }
            const answer = await directChat([promptMsg], {}, controller.signal);
            return { type: 'rag', answer, sources: matched.map(n => ({ id: n.id, title: n.title })) };
          })();

      if (controller.signal.aborted) return null;

      let assistantMsg;
      if (answer.type === 'error') {
        assistantMsg = { role: 'assistant', content: answer.message, type: 'error' };
        showToast(answer.message);
      } else {
        assistantMsg = { role: 'assistant', content: answer.answer, type: answer.type, sources: answer.sources || [], wikiLinks: answer.wikiLinks || [] };
      }

      setMessages(prev => [...prev, assistantMsg]);
      return assistantMsg;
    } catch (e) {
      if (e.name === 'AbortError') return null;
      const errMsg = { role: 'assistant', content: `Ошибка: ${e.message}`, type: 'error' };
      setMessages(prev => [...prev, errMsg]);
      return errMsg;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsLoading(false);
    }
  }, [isElectron]);

  const expandThought = useCallback(async (thought) => {
    if (!thought.trim()) return null;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const userMsg = { role: 'user', content: `Разверни мысль: ${thought}` };
      setMessages(prev => [...prev, userMsg]);

      if (isElectron) {
        const result = await window.api.ai.expandThought(thought);
        if (controller.signal.aborted) return null;
        if (result.type === 'error') {
          const errMsg = { role: 'assistant', content: result.message, type: 'error' };
          setMessages(prev => [...prev, errMsg]);
          return null;
        }
        const assistantMsg = { role: 'assistant', content: `Создана заметка «${result.note.title}»`, type: 'note_created', note: result.note };
        setMessages(prev => [...prev, assistantMsg]);
        return result.note;
      } else {
        const answer = await directChat([
          { role: 'system', content: 'Ты — AI ассистент для развёртки мыслей в заметки. Ответь развёрнуто, структурированно.' },
          userMsg,
        ], { temperature: 0.4, maxTokens: 2048 }, controller.signal);
        if (controller.signal.aborted) return null;
        const assistantMsg = { role: 'assistant', content: answer, type: 'rag' };
        setMessages(prev => [...prev, assistantMsg]);
        return assistantMsg;
      }
    } catch (e) {
      if (e.name === 'AbortError') return null;
      showToast(`Ошибка: ${e.message}`);
      return null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsLoading(false);
    }
  }, [isElectron]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { status, messages, isLoading, ask, expandThought, clearMessages, loadStatus, cancel };
}