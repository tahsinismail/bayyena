// backend/src/index.ts
import express, { Express } from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

import authRoutes from './routes/auth';
import caseRoutes from './routes/cases';
import documentRoutes from './routes/documents';
import chatRoutes from './routes/chat'; // <-- Make sure this is imported
import documentDetailRoutes from './routes/documentDetail';
import './auth/passport';

dotenv.config();

const app: Express = express();
const port = parseInt(process.env.PORT || '3001', 10);

const PgStore = connectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(
  session({
    store: new PgStore({ pool: pool, tableName: 'user_sessions' }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', documentRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/chat', chatRoutes); 
app.use('/api/documents', documentDetailRoutes);
app.get('/', (req, res) => {
  res.send('LegalCaseBuilder Backend is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[server]: Server is running at http://0.0.0.0:${port}`);
});
