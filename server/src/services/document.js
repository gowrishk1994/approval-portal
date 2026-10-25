import crypto from 'node:crypto';
import { Document } from '../models/index.js';
import { getStoredFilePath, sanitizeOriginalFileName } from '../helpers/file-storage.js';

export const documentService = {
  createRecords(workflowId, uploadedFiles) {
    return uploadedFiles.map((file) => ({
      id: crypto.randomUUID(),
      workflowId,
      originalName: sanitizeOriginalFileName(file.originalname),
      storageName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    }));
  },

  async insertRecords(records, transaction) {
    return Document.bulkCreate(records, { transaction });
  },

  async findForDownload(workflowId, documentId) {
    const document = await Document.findOne({ where: { id: documentId, workflowId } });
    if (!document) return null;
    return {
      document: document.get({ plain: true }),
      filePath: getStoredFilePath(document.storageName),
    };
  },
};
