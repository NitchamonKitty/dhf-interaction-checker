// src/controllers/entityCatalogController.js
import { getAllEntities } from '../services/entityCatalogService.js';

export async function listAllEntities(req, res, next) {
  try {
    const items = await getAllEntities();
    res.json({
      count: items.length,
      items,
    });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.publicMessage = err.publicMessage || 'Failed to load entities';
    next(err);
  }
}

export default {
  listAllEntities,
};
