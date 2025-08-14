// backend/src/routes/timeline.ts
import { Router } from 'express';
import { db } from '../db';
import { documents, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import postgres from 'postgres';

// Create a direct postgres client for raw queries
const client = postgres(process.env.DATABASE_URL!);

const router = Router();

// Apply auth middleware to all timeline routes
router.use(isAuthenticated);

// GET /api/cases/:caseId/timeline - Get all timeline events for a case
router.get('/:caseId/timeline', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const userId = (req.user as any).id;

  try {
    // Get user-created timeline events - using actual database column names
    const userEvents = await client`
      SELECT 
        te.id,
        te.event_date as "eventDate",
        te.event_description as "eventDescription", 
        te.source_type as "sourceType",
        te.source_id as "sourceId",
        te.created_at as "createdAt",
        te.updated_at as "updatedAt",
        u.full_name as "sourceName"
      FROM timeline_events te
      LEFT JOIN users u ON te.user_id = u.id
      WHERE te.case_id = ${caseId} AND te.source_type = 'user'
    `;

    // Get document-extracted timeline events
    const documentEvents = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        timeline: documents.timeline,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.caseId, caseId),
          eq(documents.processingStatus, 'PROCESSED')
        )
      );

    // Transform document timeline events to match the expected format
    const extractedEvents: any[] = [];
    documentEvents.forEach(doc => {
      if (doc.timeline && Array.isArray(doc.timeline)) {
        doc.timeline.forEach((event: any) => {
          extractedEvents.push({
            id: `doc-${doc.id}-${extractedEvents.length}`,
            eventDate: event.date,
            eventDescription: event.event,
            sourceType: 'document',
            sourceId: doc.id,
            sourceName: doc.fileName,
            createdAt: doc.createdAt,
            updatedAt: doc.createdAt,
          });
        });
      }
    });

    // Combine all events (frontend will handle sorting)
    const allEvents = [...userEvents, ...extractedEvents];

    res.json(allEvents);
  } catch (error: any) {
    console.error('Error fetching timeline events:', error);
    res.status(500).json({ message: 'Failed to fetch timeline events' });
  }
});

// POST /api/cases/:caseId/timeline - Create new timeline event
router.post('/:caseId/timeline', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const userId = (req.user as any).id;
  const { eventDate, eventDescription } = req.body;

  if (!eventDate || !eventDescription) {
    return res.status(400).json({ message: 'Event date and description are required' });
  }

  try {
    // Insert using raw SQL matching actual DB columns
    const [newEvent] = await client`
      INSERT INTO timeline_events (case_id, event_date, event_description, source_type, source_id, user_id)
      VALUES (${caseId}, ${eventDate}, ${eventDescription}, 'user', NULL, ${userId})
      RETURNING id, event_date as "eventDate", event_description as "eventDescription", source_type as "sourceType", 
                source_id as "sourceId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    // Get the user name for the response
    const [user] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId));

    const responseEvent = {
      ...newEvent,
      sourceName: user?.fullName || 'Unknown User',
    };

    res.status(201).json(responseEvent);
  } catch (error: any) {
    console.error('Error creating timeline event:', error);
    res.status(500).json({ message: 'Failed to create timeline event' });
  }
});

// PUT /api/cases/:caseId/timeline/:eventId - Update timeline event
router.put('/:caseId/timeline/:eventId', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const eventId = parseInt(req.params.eventId);
  const userId = (req.user as any).id;
  const { eventDate, eventDescription } = req.body;

  if (!eventDate || !eventDescription) {
    return res.status(400).json({ message: 'Event date and description are required' });
  }

  try {
    // Check if the event exists and belongs to the user using raw SQL
    const [existingEvent] = await client`
      SELECT id, user_id 
      FROM timeline_events 
      WHERE id = ${eventId} AND case_id = ${caseId} AND source_type = 'user'
    `;

    if (!existingEvent) {
      return res.status(404).json({ message: 'Timeline event not found or cannot be modified' });
    }

    // Only allow the creator to edit the event
    if (existingEvent.user_id !== userId) {
      return res.status(403).json({ message: 'You can only edit your own timeline events' });
    }

    // Update using raw SQL
    const [updatedEvent] = await client`
      UPDATE timeline_events 
      SET event_date = ${eventDate}, event_description = ${eventDescription}, updated_at = NOW()
      WHERE id = ${eventId}
      RETURNING id, event_date as "eventDate", event_description as "eventDescription", source_type as "sourceType", 
                source_id as "sourceId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    // Get the user name for the response
    const [user] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId));

    const responseEvent = {
      ...updatedEvent,
      sourceName: user?.fullName || 'Unknown User',
    };

    res.json(responseEvent);
  } catch (error: any) {
    console.error('Error updating timeline event:', error);
    res.status(500).json({ message: 'Failed to update timeline event' });
  }
});

// DELETE /api/cases/:caseId/timeline/:eventId - Delete timeline event
router.delete('/:caseId/timeline/:eventId', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const eventId = parseInt(req.params.eventId);
  const userId = (req.user as any).id;

  try {
    // Check if the event exists and belongs to the user using raw SQL
    const [existingEvent] = await client`
      SELECT id, user_id 
      FROM timeline_events 
      WHERE id = ${eventId} AND case_id = ${caseId} AND source_type = 'user'
    `;

    if (!existingEvent) {
      return res.status(404).json({ message: 'Timeline event not found or cannot be deleted' });
    }

    // Only allow the creator to delete the event
    if (existingEvent.user_id !== userId) {
      return res.status(403).json({ message: 'You can only delete your own timeline events' });
    }

    // Delete using raw SQL
    await client`
      DELETE FROM timeline_events WHERE id = ${eventId}
    `;

    res.json({ message: 'Timeline event deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting timeline event:', error);
    res.status(500).json({ message: 'Failed to delete timeline event' });
  }
});

// GET /api/cases/:caseId/documents/:documentId/timeline - Get timeline events for a specific document
router.get('/:caseId/documents/:documentId/timeline', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const documentId = parseInt(req.params.documentId);
  const userId = (req.user as any).id;

  try {
    // Get user-created timeline events related to this document
    const userEvents = await client`
      SELECT 
        te.id,
        te.event_date as "eventDate",
        te.event_description as "eventDescription", 
        te.source_type as "sourceType",
        te.source_id as "sourceId",
        te.created_at as "createdAt",
        te.updated_at as "updatedAt",
        u.full_name as "sourceName"
      FROM timeline_events te
      LEFT JOIN users u ON te.user_id = u.id
      WHERE te.case_id = ${caseId} AND te.source_id = ${documentId} AND te.source_type = 'user'
    `;

    // Get document-extracted timeline events for this specific document
    const [documentData] = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        timeline: documents.timeline,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.caseId, caseId),
          eq(documents.processingStatus, 'PROCESSED')
        )
      );

    // Transform document timeline events to match the expected format
    const extractedEvents: any[] = [];
    if (documentData && documentData.timeline && Array.isArray(documentData.timeline)) {
      documentData.timeline.forEach((event: any, index: number) => {
        extractedEvents.push({
          id: `doc-${documentData.id}-${index}`,
          eventDate: event.date,
          eventDescription: event.event,
          sourceType: 'document',
          sourceId: documentData.id,
          sourceName: documentData.fileName,
          createdAt: documentData.createdAt,
          updatedAt: documentData.createdAt,
        });
      });
    }

    // Combine all events (frontend will handle sorting)
    const allEvents = [...userEvents, ...extractedEvents];

    res.json(allEvents);
  } catch (error: any) {
    console.error('Error fetching document timeline events:', error);
    res.status(500).json({ message: 'Failed to fetch document timeline events' });
  }
});

// POST /api/cases/:caseId/documents/:documentId/timeline - Create new timeline event for document
router.post('/:caseId/documents/:documentId/timeline', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const documentId = parseInt(req.params.documentId);
  const userId = (req.user as any).id;
  const { eventDate, eventDescription } = req.body;

  if (!eventDate || !eventDescription) {
    return res.status(400).json({ message: 'Event date and description are required' });
  }

  try {
    // Insert using raw SQL matching actual DB columns
    const [newEvent] = await client`
      INSERT INTO timeline_events (case_id, event_date, event_description, source_type, source_id, user_id)
      VALUES (${caseId}, ${eventDate}, ${eventDescription}, 'user', ${documentId}, ${userId})
      RETURNING id, event_date as "eventDate", event_description as "eventDescription", source_type as "sourceType", 
                source_id as "sourceId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    // Get the user name for the response
    const [user] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId));

    const responseEvent = {
      ...newEvent,
      sourceName: user?.fullName || 'Unknown User',
    };

    res.status(201).json(responseEvent);
  } catch (error: any) {
    console.error('Error creating document timeline event:', error);
    res.status(500).json({ message: 'Failed to create document timeline event' });
  }
});

export default router;
