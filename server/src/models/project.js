import { DataTypes } from 'sequelize';

export function defineProjectModel(sequelize) {
  return sequelize.define('Project', {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false
    },
    name: { 
      type: DataTypes.STRING(160), 
      allowNull: false 
    },
    customer: { 
      type: DataTypes.STRING(160), 
      allowNull: false 
    },
    customerContact: { 
      type: DataTypes.STRING(160), 
      field: 'customer_contact', 
      allowNull: false 
    },
    description: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    createdAt: { 
      type: DataTypes.DATE, 
      field: 'created_at', 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
  }, { 
    tableName: 'projects', 
    timestamps: false 
  });
}