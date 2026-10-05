// Netlify vstup pro interní CRM. Logika je v core.mjs, data v Netlify Blobs (soukromé, ne v GitHubu).
import { getStore } from "@netlify/blobs";
import { handle } from "./core.mjs";

export default async (req, context) => {
  const blobs = getStore({ name: "crm", consistency: "strong" });
  const store = {
    async get(key) {
      const r = await blobs.getWithMetadata(key, { type: "json" });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async set(key, data, etag) {
      // etag === null: dokument ještě neexistuje, zapsat jen pokud ho mezitím nikdo nevytvořil
      const opts = etag === undefined ? {} : etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag };
      const r = await blobs.setJSON(key, data, opts);
      return r?.modified !== false;
    }
  };
  return handle(req, { store, env: process.env, ip: context.ip });
};

export const config = { path: "/api/crm/*" };
