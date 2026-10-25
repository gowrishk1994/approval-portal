export function toPublicDocument(document) {
  const { storageName: _storageName, ...publicDocument } = document;
  return publicDocument;
}

export function toPublicWorkflow(workflow, { includeAuditEvents = false } = {}) {
  const { documents = [], auditEvents, ...workflowFields } = workflow;
  return {
    ...workflowFields,
    documents: documents.map((document) => toPublicDocument(document)),
    ...(includeAuditEvents ? { auditEvents: auditEvents ?? [] } : {}),
  };
}
