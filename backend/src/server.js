// src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import interactionRoutes from './routes/interactions.js';

import diseaseRoutes from './routes/diseases.js';
import entitiesRoutes from './routes/entities.js';


const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'DHFI API is running' });
});

app.use('/api/interactions', interactionRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/entities', entitiesRoutes);


// error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  const safeMessage =
    err.publicMessage ||
    (status >= 500 ? 'Internal server error' : (err.message || 'Request error'));

  console.error(err);

  if (isProd) {
    return res.status(status).json({ error: safeMessage });
  }

  return res.status(status).json({
    error: safeMessage,
    detail: err.message,
    stack: err.stack,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`DHFI backend listening on http://localhost:${PORT}`);
});
