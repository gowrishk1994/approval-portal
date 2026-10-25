import { asyncHandler } from '../helpers/async-handler.js';
import { projectService } from '../services/project.js';

export const projectController = {
  list: asyncHandler(async (_request, response) => {
    response.json(await projectService.listProjects());
  }),
};
