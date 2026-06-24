const manager = require('./manager.cjs');
const tasks = require('./tasks.cjs');
const retriever = require('./retriever.cjs');

function setupAiHandlers(ipcMain, db) {
  manager.startPolling((available) => {
    try {
      const win = require('electron').BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send('ai:status', manager.getStatus());
    } catch (e) {}
  });

  ipcMain.handle('ai:getStatus', () => {
    return manager.getStatus();
  });

  ipcMain.handle('ai:setModel', (event, modelName) => {
    manager.setModel(modelName);
    return { success: true };
  });

  ipcMain.handle('ai:ask', async (event, query) => {
    if (!manager.getState().ready) {
      return { type: 'error', message: 'AI модель не готова. Проверь что Ollama запущена.' };
    }

    const embedFn = async (text) => {
      try {
        return await manager.ollamaEmbed(text);
      } catch {
        return null;
      }
    };

    const llmChatFn = async (messages) => {
      return await manager.ollamaChat(messages);
    };

    try {
      const result = await tasks.handleAsk(db, { query, embedFn, llmChatFn });
      return result;
    } catch (e) {
      return { type: 'error', message: `Ошибка: ${e.message}` };
    }
  });

  ipcMain.handle('ai:expandThought', async (event, thought) => {
    if (!manager.getState().ready) {
      return { type: 'error', message: 'AI модель не готова. Проверь что Ollama запущена.' };
    }

    const embedFn = async (text) => {
      try {
        return await manager.ollamaEmbed(text);
      } catch {
        return null;
      }
    };

    const llmChatFn = async (messages) => {
      return await manager.ollamaChat(messages, { temperature: 0.4, maxTokens: 4096 });
    };

    try {
      const expanded = await tasks.handleExpandThought(db, { thought, embedFn, llmChatFn });

      const noteResult = db.prepare(
        'INSERT INTO notes (title, content, color, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(expanded.title, expanded.content, expanded.color);

      const noteId = noteResult.lastInsertRowid;

      const parseNoteContent = require('../database.cjs').parseNoteContent;
      if (parseNoteContent) {
        parseNoteContent(db, noteId, expanded.content);
      }

      if (expanded.relatedNoteIds && expanded.relatedNoteIds.length > 0) {
        const insertLink = db.prepare('INSERT OR IGNORE INTO note_links (source_id, target_id) VALUES (?, ?)');
        for (const targetId of expanded.relatedNoteIds) {
          if (targetId !== noteId) {
            insertLink.run(noteId, targetId);
          }
        }
      }

      const created = db.prepare('SELECT id, title, content, color FROM notes WHERE id = ?').get(noteId);
      return { type: 'success', note: created };
    } catch (e) {
      return { type: 'error', message: `Ошибка при развёртке мысли: ${e.message}` };
    }
  });

  ipcMain.handle('ai:semanticSearch', async (event, query) => {
    if (!manager.getState().ready) {
      return retriever.retrieveNotesByFts(db, query, 10);
    }

    const embedFn = async (text) => {
      try {
        return await manager.ollamaEmbed(text);
      } catch {
        return null;
      }
    };

    return await retriever.hybridSearch(db, query, embedFn, 10);
  });
}

module.exports = { setupAiHandlers };
