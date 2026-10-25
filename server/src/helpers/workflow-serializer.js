export function toPublicDocument(document) {
  const { storageName: _storageName, ...publicDocument } = document;
  return publicDocument;
}

export function toPublicWorkflow(workflow, { includeAuditEvents = false } = {}) {
  const { documents = [], auditEvents, approver, ...workflowFields } = workflow;
  return {
    ...workflowFields,
    documents: documents.map((document) => toPublicDocument(document)),
    ...(approver ? { approver } : {}),
    ...(includeAuditEvents ? { auditEvents: auditEvents ?? [] } : {}),
  };
}
