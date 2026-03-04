// src/services/graphdbClient.js
import fetch from 'node-fetch';

const SPARQL_ENDPOINT = process.env.SPARQL_ENDPOINT;

export async function runSparql(query) {
  if (!SPARQL_ENDPOINT) {
    throw new Error('SPARQL_ENDPOINT is not set in .env');
  }

  const res = await fetch(SPARQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json',
    },
    body: query,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SPARQL error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.results.bindings;
}
