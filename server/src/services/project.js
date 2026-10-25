import { Project } from '../models/index.js';

export const projectService = {
  async listProjects() {
    return Project.findAll({
      attributes: ['id', 'name', 'customer', 'customerContact', 'description'],
      order: [['name', 'ASC']],
      raw: true,
    });
  },
};
