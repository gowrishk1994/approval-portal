import { z } from 'zod';
import { asyncHandler } from '../helpers/async-handler.js';
import { clearSessionCookie, findSessionUser, getSessionToken, setSessionCookie } from '../helpers/auth-session.js';
import { HttpError } from '../helpers/http-error.js';
import { verifyPassword } from '../helpers/password.js';
import { User } from '../models/index.js';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

function publicUser(user) {
  return { id: user.id, name: user.name, role: user.role };
}

export const authController = {
  login: asyncHandler(async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new HttpError(400, 'Enter a username and password.');
    // console.log('parsed', parsed.data.username, parsed.data.password);

    // console.log('parsed', await User.findAll({ where: {} }));
    const user = await User.findOne({ where: { username: parsed.data.username } });
    // console.log('user', user, parsed.data.username);
    const validPassword = user?.passwordHash
      ? await verifyPassword(parsed.data.password, user.passwordHash)
      : false;
    if (!user || !validPassword || !user.isWorkspaceAccount) {
      throw new HttpError(401, 'The username or password is incorrect.');
    }

    setSessionCookie(response, user.id);
    response.json(publicUser(user));
  }),

  session: asyncHandler(async (request, response) => {
    const user = await findSessionUser(getSessionToken(request));
    if (!user) throw new HttpError(401, 'Please sign in to continue.');
    response.json(user);
  }),

  logout: asyncHandler(async (_request, response) => {
    clearSessionCookie(response);
    response.status(204).end();
  }),
};
