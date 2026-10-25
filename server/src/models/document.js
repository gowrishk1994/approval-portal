import { DataTypes } from 'sequelize';

export function defineDocumentModel(sequelize) {
  return sequelize.define('Document', {
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
    originalName: { 
      type: DataTypes.STRING(255), 
      field: 'original_name', 
      allowNull: false 
    },
    storageName: { 
      type: DataTypes.STRING(255), 
      field: 'storage_name', 
      allowNull: false, 
      unique: true 
    },
    mimeType: { 
      type: DataTypes.STRING(160), 
      field: 'mime_type', 
      allowNull: false 
    },
    size: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      validate: { min: 1 } 
    },
    uploadedAt: { 
      type: DataTypes.DATE, 
      field: 'uploaded_at', 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
  }, { 
    tableName: 'documents', 
    timestamps: false 
  });
}