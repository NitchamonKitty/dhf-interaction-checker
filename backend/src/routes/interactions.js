// src/routes/interactions.js
import express from 'express';
import interactionController from '../controllers/interactionController.js';

const router = express.Router();

// POST /api/interactions/check
router.post('/check', interactionController.checkInteractions);

export default router;
