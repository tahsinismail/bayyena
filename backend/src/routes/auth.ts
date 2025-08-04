// src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const saltRounds = 10;

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = await db.insert(users).values({ email, hashedPassword }).returning();

    req.login(newUser[0], (err) => {
        if (err) return next(err);
        const { hashedPassword, ...userWithoutPassword } = newUser[0];
        res.status(201).json({ user: userWithoutPassword });
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', passport.authenticate('local'), (req: Request, res: Response) => {
  // If this function gets called, authentication was successful.
  // `req.user` contains the authenticated user.
  const user = req.user as typeof users.$inferSelect;
  const { hashedPassword, ...userWithoutPassword } = user;
  res.status(200).json({ user: userWithoutPassword });
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Could not log out, please try again.' });
        res.clearCookie('connect.sid'); // a good practice
        res.status(200).json({ message: 'Logged out successfully' });
    });
  });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as typeof users.$inferSelect;
    const { hashedPassword, ...userWithoutPassword } = user;
    res.status(200).json({ user: userWithoutPassword });
  } else {
    res.status(401).json({ user: null });
  }
});

export default router;
