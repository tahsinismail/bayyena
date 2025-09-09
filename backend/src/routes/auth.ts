// backend/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import * as passport from 'passport';
import * as bcrypt from 'bcrypt';
import { db } from '../db';
import { users, userActivityLogs } from '../db/schema';
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
      // Check if the existing user account is disabled
      if (existingUser[0].isActive !== 1) {
        return res.status(401).json({ 
          message: 'Thank you for creating your account! Your account is currently pending approval. Please contact our support team to activate your account and start using Bayyena.' 
        });
      }
      return res.status(409).json({ 
        message: 'An account with this email address already exists. Please use a different email or try logging in instead.' 
      });
    }

    // Check if this is the first user to determine admin role
    const allUsers = await db.select().from(users);
    const isFirstUser = allUsers.length === 0;
    
    console.log('Registration check - Total users:', allUsers.length, 'Is first user:', isFirstUser);

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Updated to insert new fields and set role based on first user check
    // First user becomes admin and is active, subsequent users are disabled by default
    const newUser = await db.insert(users).values({ 
        fullName: fullName.trim(), 
        email: email.toLowerCase().trim(), 
        hashedPassword,
        phoneNumber: phoneNumber?.trim() || null, // This can be null/undefined if not provided
        role: isFirstUser ? 'admin' : 'user', // First user becomes admin automatically
        isActive: isFirstUser ? 1 : 0 // First user is active, others are disabled by default
    }).returning();

    if (isFirstUser) {
        console.log('🎉 First user registered! Automatically assigned admin role to:', email);
        
        // Auto-login first user (admin)
        req.login(newUser[0], (err) => {
            if (err) {
              console.error('Session creation error:', err);
              return res.status(500).json({ message: 'Account created successfully, but failed to log you in automatically. Please try logging in manually.' });
            }
            const { hashedPassword, ...userWithoutPassword } = newUser[0];
            
            const response = { 
                user: userWithoutPassword,
                message: 'Welcome! As the first user, you have been automatically granted administrator privileges.'
            };
            
            res.status(201).json(response);
        });
    } else {
        // For non-admin users, don't auto-login and send pending message
        console.log('🔒 New user registered but account is disabled pending approval:', email);
        
        res.status(401).json({ 
            message: 'Thank you for creating your account! Your account is currently pending approval. Please contact our support team to activate your account and start using Bayyena.',
            accountPending: true,
            // userEmail: email.toLowerCase().trim()
        });
    }
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
    
    // Check if user account is active
    if (user.isActive !== 1) {
      console.log('User account is disabled for email:', email);
      return res.status(401).json({ message: 'We’ve temporarily restricted your account. Please get in touch with us for support.' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(401).json({ message: 'Incorrect password. Please check your password and try again.' });
    }
    
    // Log user in
    req.login(user, async (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.status(500).json({ message: 'Failed to establish session. Please try again.' });
      }
      
      // Log successful login
      try {
        await db.insert(userActivityLogs).values({
          userId: user.id,
          action: 'login',
          details: { email: user.email },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
      } catch (logError) {
        console.error('Failed to log login activity:', logError);
        // Don't fail the login if logging fails
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
