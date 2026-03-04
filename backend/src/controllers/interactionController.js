// src/controllers/interactionController.js
import { checkInteractionsByEntities } from '../services/interactionService.js';

export async function checkInteractions(req, res, next) {
  try {
    const { entIds = [], profile = {}, mode = 'consumer' } = req.body || {};

    const interactions = await checkInteractionsByEntities(entIds, profile, mode);

    const seen = new Set();
    const unique = [];

    for (const it of interactions || []) {
      if (!it) continue;

      const aId = (it.a && (it.a._id || it.a.id || it.a.iri)) || '';
      const bId = (it.b && (it.b._id || it.b.id || it.b.iri)) || '';

      const pairKey = [aId, bId].sort().join('|');

      const mech = (it.mechanism && (it.mechanism.en || it.mechanism.th)) || '';
      const key = `${pairKey}|${mech}`;

      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(it);
    }

    res.json({
      count: unique.length,
      interactions: unique,
    });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.publicMessage = err.publicMessage || 'Internal Server Error';
    next(err);
  }
}

export default {
  checkInteractions,
};