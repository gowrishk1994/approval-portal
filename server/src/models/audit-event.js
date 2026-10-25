import { DataTypes } from 'sequelize';

export function defineAuditEventModel(sequelize) {
  return sequelize.define('AuditEvent', {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false
    },
    workflowId: { 
      type: DataTypes.STRING(64), 
      field: 'workflow_id', 
      allowNull: false 
    },
    actorId: { 
      type: DataTypes.STRING(64), 
      field: 'actor_id', 
      allowNull: false 
    },
    action: { 
      type: DataTypes.STRING(100), 
      allowNull: false 
    },
    detailsJson: { 
      type: DataTypes.TEXT, 
      field: 'details_json', 
      allowNull: false, 
      defaultValue: '{}' 
    },
    createdAt: { 
      type: DataTypes.DATE, 
      field: 'created_at', 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
  }, { 
    tableName: 'audit_events', 
    timestamps: false 
  });
}