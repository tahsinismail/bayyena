// backend/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import * as passport from 'passport';
import * as bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const saltRounds = 10;

// Test route to verify auth router is working
router.get('/test', (req, res) => {
  console.log('Auth test route hit');
  res.json({ message: 'Auth router working' });
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  // Updated to include fullName and phoneNumber
  const { fullName, email, password, phoneNumber } = req.body;

  // Enhanced validation with specific error messages
  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ message: 'Full name is required and must be at least 2 characters long.' });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existingUser.length > 0) {
      return res.status(409).json({ 
        message: 'An account with this email address already exists. Please use a different email or try logging in instead.' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Updated to insert new fields
    const newUser = await db.insert(users).values({ 
        fullName: fullName.trim(), 
        email: email.toLowerCase().trim(), 
        hashedPassword,
        phoneNumber: phoneNumber?.trim() || null // This can be null/undefined if not provided
    }).returning();

    req.login(newUser[0], (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ message: 'Account created successfully, but failed to log you in automatically. Please try logging in manually.' });
        }
        const { hashedPassword, ...userWithoutPassword } = newUser[0];
        res.status(201).json({ user: userWithoutPassword });
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Registration failed due to a server error. Please try again later.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  console.log('Login request received:', { email: req.body.email, hasPassword: !!req.body.password });
  
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  
  try {
    // Check if user exists
    const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    const user = userResult[0];
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'No account found with this email address. Please check your email or create a new account.' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(401).json({ message: 'Incorrect password. Please check your password and try again.' });
    }
    
    // Log user in
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.status(500).json({ message: 'Failed to establish session. Please try again.' });
      }
      
      const { hashedPassword, ...userWithoutPassword } = user;
      console.log('Login successful for user:', userWithoutPassword.email);
      res.status(200).json({ user: userWithoutPassword });
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'An error occurred during login. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Could not log out, please try again.' });
        res.clearCookie('connect.sid');
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
