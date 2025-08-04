// src/index.ts
import express, { Express } from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

import authRoutes from './routes/auth'; // We will create this file next
import './auth/passport'; // Initialize passport configuration

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

const PgStore = connectPgSimple(session);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: 'user_sessions',
    }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('LegalCaseBuilder Backend is running!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
