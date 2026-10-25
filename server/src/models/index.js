import { sequelize } from '../config/database.js';
import { defineUserModel } from './user.js';
import { defineProjectModel } from './project.js';
import { defineWorkflowModel } from './workflow.js';
import { defineDocumentModel } from './document.js';
import { defineAuditEventModel } from './audit-event.js';

export const User = defineUserModel(sequelize);
export const Project = defineProjectModel(sequelize);
export const Workflow = defineWorkflowModel(sequelize);
export const Document = defineDocumentModel(sequelize);
export const AuditEvent = defineAuditEventModel(sequelize);

User.hasMany(Workflow, { as: 'createdWorkflows', foreignKey: 'createdBy', constraints: false });
User.hasMany(Workflow, { as: 'assignedWorkflows', foreignKey: 'approverId', constraints: false });
Workflow.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', constraints: false });
Workflow.belongsTo(User, { as: 'approver', foreignKey: 'approverId', constraints: false });
Project.hasMany(Workflow, { as: 'workflows', foreignKey: 'projectId', constraints: false });
Workflow.belongsTo(Project, { as: 'project', foreignKey: 'projectId', constraints: false });
Workflow.hasMany(Document, { as: 'documents', foreignKey: 'workflowId', onDelete: 'CASCADE', constraints: false });
Document.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId', constraints: false });
Workflow.hasMany(AuditEvent, { as: 'auditEvents', foreignKey: 'workflowId', onDelete: 'CASCADE', constraints: false });
AuditEvent.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId', constraints: false });
AuditEvent.belongsTo(User, { as: 'actor', foreignKey: 'actorId', constraints: false });

export const models = { User, Project, Workflow, Document, AuditEvent };
