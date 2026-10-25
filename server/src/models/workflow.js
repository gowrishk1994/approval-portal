import { DataTypes } from 'sequelize';

export const WORKFLOW_STATUSES = Object.freeze([
  'draft',
  'pending_approval',
  'rejected',
  'approved',
  'pending_signature',
  'completed',
]);

export function defineWorkflowModel(sequelize) {
  return sequelize.define('Workflow', {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false
    },
    projectId: { 
      type: DataTypes.STRING(64), 
      field: 'project_id', 
      allowNull: false 
    },
    projectName: { 
      type: DataTypes.STRING(160), 
      field: 'project_name', 
      allowNull: false 
    },
    customer: { 
      type: DataTypes.STRING(160), 
      allowNull: false 
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'draft',
      validate: { isIn: [WORKFLOW_STATUSES] },
    },
    createdBy: { 
      type: DataTypes.STRING(64), 
      field: 'created_by', 
      allowNull: false 
    },
    approverId: { 
      type: DataTypes.STRING(64), 
      field: 'approver_id', 
      allowNull: false 
    },
    createdAt: { 
      type: DataTypes.DATE, 
      field: 'created_at', 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
    updatedAt: { 
      type: DataTypes.DATE, 
      field: 'updated_at', 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
    submittedAt: { 
      type: DataTypes.DATE, 
      field: 'submitted_at', 
      allowNull: true 
    },
    approvedAt: { 
      type: DataTypes.DATE, 
      field: 'approved_at', 
      allowNull: true 
    },
    signedAt: { 
      type: DataTypes.DATE, 
      field: 'signed_at', 
      allowNull: true 
    },
    signatureJson: { 
      type: DataTypes.TEXT, 
      field: 'signature_json', 
      allowNull: true 
    },
    rejectionReason: { 
      type: DataTypes.STRING(500), 
      field: 'rejection_reason', 
      allowNull: true 
    },
  }, { 
    tableName: 'workflows', 
    timestamps: false 
  });
}