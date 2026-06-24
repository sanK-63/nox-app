import React, { useState, useRef, useEffect, useCallback } from 'react';

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:' || parsed.protocol === 'vbscript:') return '';
    return url;
  } catch {
    return '';
  }
}

function parseInline(text, onWikiLink) {
  const parts = [];
  let i = 0;
  const tokens = [];

  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      tokens.push({ type: 'text', value: text[i + 1] });
      i += 2;
      continue;
    }
    if (text.substring(i, i + 2) === '**') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', value: text.substring(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text.substring(i, i + 2) === '__') {
      const end = text.indexOf('__', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', value: text.substring(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'italic', value: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '_' && text[i + 1] !== '_') {
      const end = text.indexOf('_', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'italic', value: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.substring(i, i + 2) === '`' && text[i + 2] === '`') {
      const end = text.indexOf('```', i + 3);
      if (end !== -1) {
        tokens.push({ type: 'code', value: text.substring(i + 3, end) });
        i = end + 3;
        continue;
      }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'inlinecode', value: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.substring(i, i + 2) === '[[') {
      const end = text.indexOf(']]', i + 2);
      if (end !== -1) {
        const raw = text.substring(i + 2, end);
        const parts2 = raw.split('|');
        const title = parts2[0].trim();
        const alias = parts2[1] ? parts2[1].trim() : null;
        tokens.push({ type: 'wikilink', title, alias });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '[') {
      const closeB = text.indexOf(']', i + 1);
      if (closeB !== -1 && text[closeB + 1] === '(') {
        const closeP = text.indexOf(')', closeB + 2);
        if (closeP !== -1) {
          const linkText = text.substring(i + 1, closeB);
          const url = text.substring(closeB + 2, closeP);
          tokens.push({ type: 'link', text: linkText, url });
          i = closeP + 1;
          continue;
        }
      }
    }
    tokens.push({ type: 'text', value: text[i] });
    i++;
  }

  const result = [];
  let currentText = '';
  for (const token of tokens) {
    if (token.type === 'text') {
      currentText += token.value;
    } else {
      if (currentText) {
        result.push(escapeHtml(currentText));
        currentText = '';
      }
      switch (token.type) {
        case 'bold':
          result.push(<strong key={result.length}>{parseInline(token.value, onWikiLink)}</strong>);
          break;
        case 'italic':
          result.push(<em key={result.length}>{parseInline(token.value, onWikiLink)}</em>);
          break;
        case 'code':
        case 'inlinecode':
          result.push(<code key={result.length} className="md-inline-code">{escapeHtml(token.value)}</code>);
          break;
        case 'link': {
          const safeUrl = sanitizeUrl(token.url);
          if (!safeUrl) {
            result.push(escapeHtml(token.text));
          } else {
            result.push(<a key={result.length} href={safeUrl} className="md-link" target="_blank" rel="noopener noreferrer">{parseInline(token.text, onWikiLink)}</a>);
          }
          break;
        }
          break;
        case 'wikilink':
          result.push(
            <WikiLinkSpan key={result.length} title={token.title} alias={token.alias} onWikiLink={onWikiLink} />
          );
          break;
      }
    }
  }
  if (currentText) result.push(escapeHtml(currentText));
  return result.length === 1 && typeof result[0] === 'string' ? result[0] : result;
}

function WikiLinkSpan({ title, alias, onWikiLink }) {
  const [tooltip, setTooltip] = useState(null);
  const hoverTimer = useRef(null);
  const spanRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(async () => {
      try {
        if (window.api?.notes?.searchByTitle) {
          const results = await window.api.notes.searchByTitle(title);
          if (results.length > 0 && results[0].content) {
            const el = spanRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const preview = results[0].content.replace(/\[\[([^\]]+)\]\]/g, '$1').slice(0, 200);
            setTooltip({ x: rect.left, y: rect.bottom + 4, text: preview });
          }
        }
      } catch {}
    }, 400);
  }, [title]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setTooltip(null);
  }, []);

  useEffect(() => {
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); };
  }, []);

  return (
    <>
      <span
        ref={spanRef}
        className="md-wikilink"
        onClick={() => onWikiLink && onWikiLink(title)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {escapeHtml(alias || title)}
      </span>
      {tooltip && (
        <div className="md-wiki-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="md-wiki-tooltip-title">{escapeHtml(title)}</div>
          <div className="md-wiki-tooltip-body">{escapeHtml(tooltip.text)}</div>
        </div>
      )}
    </>
  );
}

function processCodeBlock(lines, startIdx) {
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.trim().startsWith('```'));
  if (endIdx === -1) return { node: null, consumed: 1 };
  const code = lines.slice(startIdx + 1, endIdx).join('\n');
  const langMatch = lines[startIdx].trim().match(/^```(\w*)/);
  const lang = langMatch ? langMatch[1] : '';
  return {
    node: <pre key={startIdx} className={`md-code-block${lang ? ' lang-' + lang : ''}`}><code>{escapeHtml(code)}</code></pre>,
    consumed: endIdx - startIdx + 1
  };
}

export default function MarkdownRenderer({ content, onWikiLink, onToggleCheckbox, className = '', linkedTasks }) {
  if (!content) return null;
  const lines = content.split('\n');
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const result = processCodeBlock(lines, i);
      if (result.node) {
        nodes.push(result.node);
        i += result.consumed;
        continue;
      }
    }

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^(#{1,6})/)[1].length;
      const text = line.slice(level + 1);
      const Tag = `h${level}`;
      nodes.push(<Tag key={i} className={`md-heading md-h${level}`}>{parseInline(text, onWikiLink)}</Tag>);
      i++;
      continue;
    }

    if (/^>/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      nodes.push(<blockquote key={i} className="md-blockquote">{parseInline(quoteLines.join('\n'), onWikiLink)}</blockquote>);
      continue;
    }

    const taskMatch = line.match(/^(- \[([ x])\] )(.*)/);
    if (taskMatch) {
      const checked = taskMatch[2] === 'x';
      const label = taskMatch[3];
      const lineIndex = i;
      const linkedTask = linkedTasks?.find(t => t.title === label);
      nodes.push(
        <div key={i} className="md-task-line">
          <input
            type="checkbox"
            checked={checked}
            onChange={async () => {
              if (!onToggleCheckbox) return;
              const newLines = [...lines];
              const current = newLines[lineIndex];
              const toggled = checked
                ? current.replace(/^(- \[)x(\] .*)/, '$1 $2')
                : current.replace(/^(- \[ )(\] .*)/, '$1x$2');
              newLines[lineIndex] = toggled;
              onToggleCheckbox(newLines.join('\n'));
              // Мгновенная синхронизация с задачей в БД
              if (linkedTask?.id && window.api?.toggleTask) {
                try {
                  await window.api.toggleTask({ id: linkedTask.id, is_completed: !checked });
                } catch {}
              }
            }}
          />
          <span>{parseInline(label, onWikiLink)}</span>
        </div>
      );
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const listItems = [];
      const isOrdered = /^\d+\.\s/.test(line);
      while (i < lines.length && (/^[-*]\s/.test(lines[i]) || /^\d+\.\s/.test(lines[i]))) {
        const text = lines[i].replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
        listItems.push(<li key={i}>{parseInline(text, onWikiLink)}</li>);
        i++;
      }
      const Tag = isOrdered ? 'ol' : 'ul';
      nodes.push(<Tag key={i} className="md-list">{listItems}</Tag>);
      continue;
    }

    if (/^---/.test(line.trim())) {
      nodes.push(<hr key={i} className="md-hr" />);
      i++;
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    nodes.push(<p key={i} className="md-paragraph">{parseInline(line, onWikiLink)}</p>);
    i++;
  }

  return <div className={`markdown-body ${className}`}>{nodes}</div>;
}
