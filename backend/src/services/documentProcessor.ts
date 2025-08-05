// backend/src/services/documentProcessor.ts
import fs from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';

const processDocument = async (docId: number, filePath: string, mimeType: string) => {
    let text = '';
    try {
        console.log(`Processing document ID: ${docId}, Type: ${mimeType}`);

        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            text = data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        } else if (mimeType.startsWith('image/')) {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(filePath);
            text = ret.data.text;
            await worker.terminate();
        } else {
            throw new Error('Unsupported file type for text extraction.');
        }

        // Update the document record with the extracted text and set status to PROCESSED
        await db.update(documents)
            .set({ extractedText: text, processingStatus: 'PROCESSED' })
            .where(eq(documents.id, docId));

        console.log(`Successfully processed and stored text for document ID: ${docId}`);

    } catch (error) {
        console.error(`Failed to process document ID: ${docId}`, error);
        // Update the document status to FAILED
        await db.update(documents)
            .set({ processingStatus: 'FAILED' })
            .where(eq(documents.id, docId));
    }
};

export { processDocument };
