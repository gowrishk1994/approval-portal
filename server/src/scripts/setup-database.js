import 'dotenv/config';
import { closeDatabase, initializeDatabase } from '../config/database.js';
import { seedInitialData } from '../config/seed.js';
import '../models/index.js';

try {
  await initializeDatabase();
  await seedInitialData();
} finally {
  await closeDatabase();
}
