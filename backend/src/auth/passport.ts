// src/auth/passport.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      console.log('Passport strategy called with email:', email);
      
      const userResult = await db.select().from(users).where(eq(users.email, email));
      const user = userResult[0];
      
      if (!user) {
        console.log('User not found for email:', email);
        return done(null, false, { message: 'No account found with this email address. Please check your email or register for a new account.' });
      }

      // Check if user account is active
      if (user.isActive !== 1) {
        console.log('User account is disabled for email:', email);
        return done(null, false, { message: 'We’ve temporarily restricted your account. Please get in touch with us for support.' });
      }

      const isMatch = await bcrypt.compare(password, user.hashedPassword);
      if (!isMatch) {
        console.log('Password mismatch for user:', email);
        return done(null, false, { message: 'Incorrect password. Please check your password and try again.' });
      }
      
      console.log('Authentication successful for user:', email);
      return done(null, user);
    } catch (err) {
      console.error('Passport strategy error:', err);
      return done(err);
    }
  })
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const userResult = await db.select().from(users).where(eq(users.id, id));
    const user = userResult[0];
    
    if (!user) {
      return done(null, false);
    }
    
    // Check if user account is still active
    if (user.isActive !== 1) {
      console.log('User account is disabled during session deserialization for user ID:', id);
      return done(null, false);
    }
    
    done(null, user);
  } catch (err) {
    done(err);
  }
});
