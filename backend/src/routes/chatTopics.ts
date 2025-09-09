// backend/src/routes/chatTopics.ts
import { Router } from 'express';
import { db } from '../db';
import { chatTopics, cases, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Use authentication middleware for all routes
router.use(isAuthenticated);

// GET /api/chat-topics/:caseId - Get all chat topics for a specific case
router.get('/:caseId', async (req, res, next) => {
  const user = req.user as typeof users.$inferSelect;
  const caseId = parseInt(req.params.caseId);

  if (isNaN(caseId)) {
    return res.status(400).json({ message: 'Invalid case ID' });
  }

  try {
    // First verify that the case belongs to the user
    const caseExists = await db.select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.userId, user.id)))
      .limit(1);

    if (caseExists.length === 0) {
      return res.status(404).json({ message: 'Case not found or access denied' });
    }

    // Get all chat topics for this case
    const topics = await db.select()
      .from(chatTopics)
      .where(eq(chatTopics.caseId, caseId))
      .orderBy(chatTopics.createdAt);

    res.status(200).json(topics);
  } catch (error) {
    console.error('Error fetching chat topics:', error);
    next(error);
  }
});

// POST /api/chat-topics/:caseId - Create a new chat topic for a case
router.post('/:caseId', async (req, res, next) => {
  const user = req.user as typeof users.$inferSelect;
  const caseId = parseInt(req.params.caseId);
  const { title, description } = req.body;

  if (isNaN(caseId)) {
    return res.status(400).json({ message: 'Invalid case ID' });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ message: 'Topic title is required' });
  }

  try {
    // First verify that the case belongs to the user
    const caseExists = await db.select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.userId, user.id)))
      .limit(1);

    if (caseExists.length === 0) {
      return res.status(404).json({ message: 'Case not found or access denied' });
    }

    // Create the new chat topic
    const [newTopic] = await db.insert(chatTopics).values({
      caseId: caseId,
      title: title.trim(),
      description: description?.trim() || null,
      userId: user.id
    }).returning();

    res.status(201).json({
      message: 'Chat topic created successfully',
      topic: newTopic
    });
  } catch (error) {
    console.error('Error creating chat topic:', error);
    next(error);
  }
});

// PUT /api/chat-topics/:topicId - Update a chat topic
router.put('/topic/:topicId', async (req, res, next) => {
  const user = req.user as typeof users.$inferSelect;
  const topicId = parseInt(req.params.topicId);
  const { title, description } = req.body;

  if (isNaN(topicId)) {
    return res.status(400).json({ message: 'Invalid topic ID' });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ message: 'Topic title is required' });
  }

  try {
    // First verify that the topic belongs to the user (via case ownership)
    const topicWithCase = await db.select({
      topic: chatTopics,
      case: cases
    })
    .from(chatTopics)
    .innerJoin(cases, eq(chatTopics.caseId, cases.id))
    .where(and(
      eq(chatTopics.id, topicId),
      eq(cases.userId, user.id)
    ))
    .limit(1);

    if (topicWithCase.length === 0) {
      return res.status(404).json({ message: 'Chat topic not found or access denied' });
    }

    // Update the chat topic
    const [updatedTopic] = await db.update(chatTopics)
      .set({
        title: title.trim(),
        description: description?.trim() || null,
        updatedAt: new Date()
      })
      .where(eq(chatTopics.id, topicId))
      .returning();

    res.status(200).json({
      message: 'Chat topic updated successfully',
      topic: updatedTopic
    });
  } catch (error) {
    console.error('Error updating chat topic:', error);
    next(error);
  }
});

// DELETE /api/chat-topics/:topicId - Delete a chat topic
router.delete('/topic/:topicId', async (req, res, next) => {
  const user = req.user as typeof users.$inferSelect;
  const topicId = parseInt(req.params.topicId);

  if (isNaN(topicId)) {
    return res.status(400).json({ message: 'Invalid topic ID' });
  }

  try {
    // First verify that the topic belongs to the user (via case ownership)
    const topicWithCase = await db.select({
      topic: chatTopics,
      case: cases
    })
    .from(chatTopics)
    .innerJoin(cases, eq(chatTopics.caseId, cases.id))
    .where(and(
      eq(chatTopics.id, topicId),
      eq(cases.userId, user.id)
    ))
    .limit(1);

    if (topicWithCase.length === 0) {
      return res.status(404).json({ message: 'Chat topic not found or access denied' });
    }

    // Delete the chat topic (this will cascade delete related messages)
    await db.delete(chatTopics).where(eq(chatTopics.id, topicId));

    res.status(200).json({
      message: 'Chat topic deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat topic:', error);
    next(error);
  }
});

export default router;
