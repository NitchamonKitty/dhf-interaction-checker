// src/routes/diseases.js
import express from 'express';
import diseaseController from '../controllers/diseaseController.js';

const router = express.Router();

router.get('/search', diseaseController.searchDiseases);
router.get('/:id/suggestions', diseaseController.getSuggestions);

export default router;
