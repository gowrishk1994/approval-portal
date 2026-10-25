import { asyncHandler } from '../helpers/async-handler.js';
import { getSessionToken, findSessionUser } from '../helpers/auth-session.js';
import { HttpError } from '../helpers/http-error.js';

export const requireAuthentication = asyncHandler(async (request, _response, next) => {
  const user = await findSessionUser(getSessionToken(request));
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  request.authenticatedUser = user;
  next();
});
