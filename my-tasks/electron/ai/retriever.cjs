function retrieveNotesByFts(db, query, limit = 10) {
  if (!query || !query.trim()) return [];
  try {
    const ftsResults = db.prepare(`
      SELECT n.id, n.title, n.content, n.updated_at
      FROM notes n
      JOIN notes_fts fts ON fts.rowid = n.id
      WHERE fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query.trim(), limit);
    if (ftsResults.length > 0) return ftsResults;
  } catch (e) {
    // fallback
  }

  return db.prepare(`
    SELECT id, title, content, updated_at FROM notes
    WHERE title LIKE ? OR content LIKE ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, limit);
}

function retrieveNotesByTags(db, tags, limit = 10) {
  if (!tags || tags.length === 0) return [];
  const placeholders = tags.map(() => '?').join(',');
  return db.prepare(`
    SELECT DISTINCT n.id, n.title, n.content, n.updated_at
    FROM notes n
    JOIN note_tags nt ON nt.note_id = n.id
    WHERE nt.tag IN (${placeholders})
    ORDER BY n.updated_at DESC
    LIMIT ?
  `).all(...tags.map(t => t.toLowerCase()), limit);
}

function retrieveNotesByFolder(db, folderId, limit = 10) {
  return db.prepare(`
    SELECT id, title, content, updated_at FROM notes
    WHERE folder_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(folderId, limit);
}

function retrieveAllNotes(db, limit = 20) {
  return db.prepare(`
    SELECT id, title, content, updated_at FROM notes
    ORDER BY is_pinned DESC, updated_at DESC
    LIMIT ?
  `).all(limit);
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  na = Math.sqrt(na);
  nb = Math.sqrt(nb);
  if (na === 0 || nb === 0) return 0;
  return dot / (na * nb);
}

function float32ArrayToBuffer(arr) {
  const buf = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) {
    buf.writeFloatLE(arr[i], i * 4);
  }
  return buf;
}

function bufferToFloat32Array(buf) {
  const arr = [];
  for (let i = 0; i < buf.length; i += 4) {
    arr.push(buf.readFloatLE(i));
  }
  return arr;
}

async function hybridSearch(db, query, embedFn, limit = 10) {
  const ftsResults = retrieveNotesByFts(db, query, limit * 2);

  let semanticResults = [];
  try {
    const queryVec = await embedFn(query);
    if (queryVec && queryVec.length > 0) {
      const allEmbeddings = db.prepare('SELECT note_id, vector FROM ai_note_embeddings').all();
      const scored = allEmbeddings
        .map((row) => {
          const vec = bufferToFloat32Array(row.vector);
          return {
            noteId: row.note_id,
            score: cosineSimilarity(queryVec, vec),
          };
        })
        .filter((r) => r.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (scored.length > 0) {
        const ids = scored.map((r) => r.noteId);
        const placeholders = ids.map(() => '?').join(',');
        semanticResults = db.prepare(`
          SELECT id, title, content, updated_at FROM notes
          WHERE id IN (${placeholders})
        `).all(...ids);
      }
    }
  } catch (e) {
    // fallback to FTS only
  }

  const seen = new Set();
  const merged = [];
  for (const r of [...ftsResults, ...semanticResults]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r);
    }
    if (merged.length >= limit) break;
  }

  return merged;
}

module.exports = {
  retrieveNotesByFts,
  retrieveNotesByTags,
  retrieveNotesByFolder,
  retrieveAllNotes,
  hybridSearch,
  cosineSimilarity,
  float32ArrayToBuffer,
  bufferToFloat32Array,
};
