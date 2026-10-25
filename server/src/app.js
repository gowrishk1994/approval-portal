import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createApiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { createWorkflowService, workflowService } from './services/workflow.js';

export function createApp({ notify, workflowService: injectedWorkflowService } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb', strict: true }));

  const service = injectedWorkflowService
    ?? (notify ? createWorkflowService({ notify }) : workflowService);
  app.use('/api', createApiRouter({ service }));
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'API endpoint not found.' });
  });
  app.use(errorHandler);

  return app;
}
