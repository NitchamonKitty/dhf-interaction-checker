// src/controllers/diseaseController.js
import { searchUnderlyingDisease, getDiseaseSuggestions } from '../services/diseaseService.js';

const diseaseController = {
  async searchDiseases(req, res, next) {
    try {
      const { q } = req.query;
      const items = await searchUnderlyingDisease(q || '');
      res.json({ count: items.length, items });
    } catch (err) {
      next(err);
    }
  },

  async getSuggestions(req, res, next) {
    try {
      const { id } = req.params; // เช่น 'UNDERLYING_DM2' หรือ IRI tail
      const result = await getDiseaseSuggestions(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};

export default diseaseController;
