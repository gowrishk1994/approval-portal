import { DataTypes } from 'sequelize';

export function defineUserModel(sequelize) {
  return sequelize.define('User', {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false
    },
    name: { 
      type: DataTypes.STRING(120), 
      allowNull: false 
    },
    email: { 
      type: DataTypes.STRING(254), 
      allowNull: false, 
      unique: true, 
      validate: { isEmail: true } 
    },
    role: { 
      type: DataTypes.STRING(32), 
      allowNull: false, 
      validate: { isIn: [['requester', 'approver']] } 
    },
    username: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(256),
      field: 'password_hash',
      allowNull: true,
    },
    isWorkspaceAccount: {
      type: DataTypes.BOOLEAN,
      field: 'workspace_visible',
      allowNull: false,
      defaultValue: true,
    },
    createdAt: { 
      type: DataTypes.DATE, 
      field: 'created_at', 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
  }, { 
    tableName: 'users', 
    timestamps: false 
  });
}