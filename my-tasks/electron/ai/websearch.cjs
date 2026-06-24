const https = require('https');

async function searchWeb(query) {
  const encoded = encodeURIComponent(query);

  const results = await fetchDdg(encoded);
  if (results && results.length > 0) return results;

  return [
    {
      title: `Результаты поиска: ${query}`,
      snippet: `Поиск по запросу "${query}" не дал результатов.`,
      url: `https://duckduckgo.com/?q=${encoded}`,
    },
  ];
}

function fetchDdg(encodedQuery) {
  return new Promise((resolve) => {
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const results = parseDdgHtml(data);
        resolve(results);
      });
    });

    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
  });
}

function parseDdgHtml(html) {
  const results = [];
  const resultBlocks = html.split('<div class="result__body">');

  for (let i = 1; i < resultBlocks.length && results.length < 5; i++) {
    const block = resultBlocks[i];
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = block.match(/class="result__snippet">([\s\S]*?)<\/a>/i);
    const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"/i);

    if (titleMatch) {
      let url = linkMatch ? linkMatch[1] : '';
      try {
        const parsed = new URL(url);
        if (parsed.hostname === 'duckduckgo.com' && parsed.pathname === '/l/') {
          url = decodeURIComponent(parsed.searchParams.get('uddg') || url);
        }
      } catch (e) {}

      results.push({
        title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
        snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '',
        url,
      });
    }
  }

  return results;
}

module.exports = { searchWeb };
