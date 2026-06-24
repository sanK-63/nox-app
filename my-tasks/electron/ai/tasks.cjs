const prompts = require('./prompts.cjs');
const retriever = require('./retriever.cjs');
const websearch = require('./websearch.cjs');

const WEB_SEARCH_TRIGGERS = [
  'найди в интернете', 'поищи', 'загугли', 'найди в сети',
  'поиск в интернете', 'поищи в интернете', 'search internet',
  'search web', 'look up', 'find online',
];

function isWebSearchQuery(query) {
  const q = query.toLowerCase().trim();
  return WEB_SEARCH_TRIGGERS.some((t) => q.includes(t));
}

function stripWebSearchTriggers(query) {
  let q = query;
  for (const t of WEB_SEARCH_TRIGGERS) {
    q = q.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  return q.trim();
}

async function handleAsk(db, { query, embedFn, llmChatFn }) {
  const isWeb = isWebSearchQuery(query);

  if (isWeb) {
    const cleanQuery = stripWebSearchTriggers(query);
    let searchResults;
    try {
      searchResults = await websearch.searchWeb(cleanQuery);
    } catch (e) {
      return {
        type: 'error',
        message: 'Не удалось выполнить поиск в интернете. Проверь подключение к сети.',
      };
    }

    const prompt = prompts.buildWebSearchPrompt(searchResults, cleanQuery);
    const answer = await llmChatFn([
      { role: 'user', content: prompt },
    ]);

    return {
      type: 'web',
      answer,
      sources: searchResults.map((r) => ({ title: r.title, url: r.url })),
    };
  }

  const notes = await retriever.hybridSearch(db, query, embedFn, 10);

  if (!notes || notes.length === 0) {
    return {
      type: 'rag',
      answer: 'В твоих заметках не найдено информации об этом.',
      sources: [],
    };
  }

  const prompt = prompts.buildRagPrompt(notes, query);
  const answer = await llmChatFn([
    { role: 'user', content: prompt },
  ]);

  const wikiLinks = extractWikiLinks(answer);

  return {
    type: 'rag',
    answer,
    sources: notes.map((n) => ({ id: n.id, title: n.title })),
    wikiLinks,
  };
}

async function handleExpandThought(db, { thought, embedFn, llmChatFn }) {
  const relatedNotes = await retriever.hybridSearch(db, thought, embedFn, 5);

  const prompt = prompts.buildExpandPrompt(relatedNotes, thought);
  const raw = await llmChatFn([
    { role: 'user', content: prompt },
  ]);

  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch (e) {
    // fallback: use raw response as content
    parsed = {
      title: thought.slice(0, 60),
      content: raw,
      color: '#8b5cf6',
    };
  }

  return {
    title: parsed.title || thought.slice(0, 60),
    content: parsed.content || raw,
    color: parsed.color || '#8b5cf6',
    relatedNoteIds: relatedNotes.map((n) => n.id),
  };
}

function extractWikiLinks(text) {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

module.exports = {
  handleAsk,
  handleExpandThought,
  extractWikiLinks,
  isWebSearchQuery,
};
