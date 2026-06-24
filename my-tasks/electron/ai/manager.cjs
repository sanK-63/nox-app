const http = require('http');
const { execSync } = require('child_process');

const OLLAMA_DEFAULT_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen2.5:3b';

let state = {
  available: false,
  model: DEFAULT_MODEL,
  ollamaUrl: OLLAMA_DEFAULT_URL,
  ready: false,
  checkInterval: null,
};

function checkOllama() {
  return new Promise((resolve) => {
    const req = http.get(`${state.ollamaUrl}/api/tags`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          state.available = true;
          state.ready = true;
          resolve(true);
        } catch {
          state.available = false;
          resolve(false);
        }
      });
    });
    req.on('error', () => {
      state.available = false;
      state.ready = false;
      resolve(false);
    });
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

function startPolling(callback) {
  checkOllama().then((ok) => {
    if (callback) callback(ok);
  });
  state.checkInterval = setInterval(async () => {
    const ok = await checkOllama();
    if (callback) callback(ok);
  }, 30000);
}

function stopPolling() {
  if (state.checkInterval) {
    clearInterval(state.checkInterval);
    state.checkInterval = null;
  }
}

function getStatus() {
  return {
    available: state.available,
    ready: state.ready,
    model: state.model,
    backend: 'ollama',
  };
}

function setModel(modelName) {
  state.model = modelName;
}

function ollamaGenerate(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: state.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 2048,
      },
    });

    const req = http.request(`${state.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.response || '');
        } catch (e) {
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function ollamaChat(messages, options = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: state.model,
      messages: messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 4096,
      },
    });

    const req = http.request(`${state.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.message?.content || '');
        } catch (e) {
          reject(new Error('Failed to parse Ollama chat response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function ollamaEmbed(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: state.model,
      prompt: text,
    });

    const req = http.request(`${state.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.embedding || []);
        } catch {
          reject(new Error('Failed to parse embedding'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = {
  startPolling,
  stopPolling,
  getStatus,
  setModel,
  ollamaGenerate,
  ollamaChat,
  ollamaEmbed,
  checkOllama,
  getState: () => state,
};
