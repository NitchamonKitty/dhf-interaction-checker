// src/routes/entities.js
import express from 'express';
import entityCatalogController from '../controllers/entityCatalogController.js';

const router = express.Router();

// GET /api/entities/all
router.get('/all', entityCatalogController.listAllEntities);

export default router;
