// Úložiště CRM v Cloudflare D1. Data jsou jeden JSON dokument (gzip, ať se vejde do limitu
// řádku 2 MB i za pár let) a fotky jako BLOB. Zápis dokumentu je podmíněný přes číslo verze,
// takže dva současné zápisy se nepřepíšou (core.mjs pak zkusí znovu).
async function gzip(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(data) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

export function d1Store(db) {
  return {
    async get(key) {
      const r = await db.prepare("SELECT value, version FROM kv WHERE key = ?").bind(key).first();
      return r ? { data: JSON.parse(await gunzip(r.value)), etag: r.version } : null;
    },
    async set(key, data, etag) {
      const value = await gzip(JSON.stringify(data));
      if (etag === undefined) {
        await db.prepare("INSERT INTO kv (key, value, version) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value, version = kv.version + 1").bind(key, value).run();
        return true;
      }
      if (etag === null) {
        const r = await db.prepare("INSERT INTO kv (key, value, version) VALUES (?, ?, 1) ON CONFLICT(key) DO NOTHING").bind(key, value).run();
        return r.meta.changes === 1;
      }
      const r = await db.prepare("UPDATE kv SET value = ?, version = version + 1 WHERE key = ? AND version = ?").bind(value, key, etag).run();
      return r.meta.changes === 1;
    },
    async getBinary(key) {
      const r = await db.prepare("SELECT data FROM files WHERE key = ?").bind(key).first();
      if (!r) return null;
      return r.data instanceof ArrayBuffer ? r.data : new Uint8Array(r.data).buffer;
    },
    async setBinary(key, buf) {
      await db.prepare("INSERT INTO files (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data").bind(key, new Uint8Array(buf)).run();
    }
  };
}
