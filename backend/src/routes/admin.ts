// backend/src/routes/admin.ts
import { Router } from 'express';
import { eq, desc, and, count, gte } from 'drizzle-orm';
import { db } from '../db';
import { users, adminActivityLogs, userActivityLogs, userFeatureToggles } from '../db/schema';
import { isAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply admin middleware to all admin routes
router.use(isAdmin);

// Get all users with their roles and status
router.get('/users', async (req, res) => {
  try {
    const userList = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users);

    res.json(userList);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, parseInt(id))).limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userResult[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = (req.user as any).id;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Get current user info for logging
    const currentUser = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);
    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user role
    await db.update(users)
      .set({ role })
      .where(eq(users.id, parseInt(id)));

    // Log admin action
    await db.insert(adminActivityLogs).values({
      adminId,
      action: 'user_role_changed',
      targetUserId: parseInt(id),
      details: {
        oldRole: currentUser[0].role,
        newRole: role,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enable/disable user
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = (req.user as any).id;

    if (typeof isActive !== 'number' || (isActive !== 0 && isActive !== 1)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get current user info for logging
    const currentUser = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);
    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user status
    await db.update(users)
      .set({ isActive })
      .where(eq(users.id, parseInt(id)));

    // Log admin action
    await db.insert(adminActivityLogs).values({
      adminId,
      action: isActive ? 'user_enabled' : 'user_disabled',
      targetUserId: parseInt(id),
      details: {
        oldStatus: currentUser[0].isActive,
        newStatus: isActive,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ message: `User ${isActive ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change user password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = (req.user as any).id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Get current user info for logging
    const currentUser = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);
    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the new password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await db.update(users)
      .set({ hashedPassword })
      .where(eq(users.id, parseInt(id)));

    // Log admin action
    await db.insert(adminActivityLogs).values({
      adminId,
      action: 'user_password_changed',
      targetUserId: parseInt(id),
      details: {
        targetUserEmail: currentUser[0].email,
        targetUserName: currentUser[0].fullName,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing user password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user activity logs
router.get('/activity', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;

    let activities;
    if (userId) {
      activities = await db.select().from(userActivityLogs)
        .where(eq(userActivityLogs.userId, parseInt(userId as string)))
        .orderBy(desc(userActivityLogs.createdAt))
        .limit(parseInt(limit as string));
    } else {
      activities = await db.select().from(userActivityLogs)
        .orderBy(desc(userActivityLogs.createdAt))
        .limit(parseInt(limit as string));
    }

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get admin activity logs
router.get('/admin-activity', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get admin activities without user names for now
    const activities = await db.select({
      id: adminActivityLogs.id,
      action: adminActivityLogs.action,
      details: adminActivityLogs.details,
      createdAt: adminActivityLogs.createdAt,
      adminId: adminActivityLogs.adminId,
      targetUserId: adminActivityLogs.targetUserId,
    })
    .from(adminActivityLogs)
    .orderBy(desc(adminActivityLogs.createdAt))
    .limit(parseInt(limit as string));

    // Transform to match frontend expectations
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      createdAt: activity.createdAt,
      adminName: `Admin ${activity.adminId}`,
      targetUserName: activity.targetUserId ? `User ${activity.targetUserId}` : null,
    }));

    res.json(transformedActivities);
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Get total users count
    const totalUsersResult = await db.select({ count: count() })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active users count
    const activeUsersResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.isActive, 1));
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get admin users count
    const adminUsersResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const adminUsers = adminUsersResult[0]?.count || 0;

    // Get recent activity count (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentActivityResult = await db.select({ count: count() })
      .from(userActivityLogs)
      .where(gte(userActivityLogs.createdAt, yesterday));
    const recentActivity = recentActivityResult[0]?.count || 0;

    res.json({
      totalUsers,
      activeUsers,
      adminUsers,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user feature toggles
router.get('/users/:id/features', async (req, res) => {
  try {
    const { id } = req.params;

    const features = await db.select().from(userFeatureToggles)
      .where(eq(userFeatureToggles.userId, parseInt(id)));

    res.json(features);
  } catch (error) {
    console.error('Error fetching user features:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Toggle user feature
router.put('/users/:id/features/:featureName', async (req, res) => {
  try {
    const { id, featureName } = req.params;
    const { isEnabled } = req.body;
    const adminId = (req.user as any).id;

    if (typeof isEnabled !== 'number' || (isEnabled !== 0 && isEnabled !== 1)) {
      return res.status(400).json({ message: 'Invalid feature status' });
    }

    // Check if feature toggle exists
    const existingToggle = await db.select().from(userFeatureToggles)
      .where(and(
        eq(userFeatureToggles.userId, parseInt(id)),
        eq(userFeatureToggles.featureName, featureName)
      )).limit(1);

    if (existingToggle.length === 0) {
      // Create new feature toggle
      await db.insert(userFeatureToggles).values({
        userId: parseInt(id),
        featureName,
        isEnabled,
      });
    } else {
      // Update existing feature toggle
      await db.update(userFeatureToggles)
        .set({ isEnabled })
        .where(and(
          eq(userFeatureToggles.userId, parseInt(id)),
          eq(userFeatureToggles.featureName, featureName)
        ));
    }

    // Log admin action
    await db.insert(adminActivityLogs).values({
      adminId,
      action: 'feature_toggled',
      targetUserId: parseInt(id),
      details: {
        featureName,
        oldStatus: existingToggle.length > 0 ? existingToggle[0].isEnabled : 0,
        newStatus: isEnabled,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ message: `Feature ${featureName} ${isEnabled ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    console.error('Error toggling user feature:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req.user as any).id;
    const userId = parseInt(id);

    // Check if user exists
    const userToDelete = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userToDelete.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Check if this is the last admin
    const adminCount = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (userToDelete[0].role === 'admin' && adminCount[0].count <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin user' });
    }

    // Log admin action BEFORE deleting the user
    await db.insert(adminActivityLogs).values({
      adminId,
      action: 'user_deleted',
      targetUserId: null, // Set to null since the user will be deleted
      details: {
        deletedUserEmail: userToDelete[0].email,
        deletedUserName: userToDelete[0].fullName,
        deletedUserRole: userToDelete[0].role,
        deletedUserId: userId, // Store the ID in details instead
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Delete the user (cascade will handle related records)
    await db.delete(users).where(eq(users.id, userId));

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
