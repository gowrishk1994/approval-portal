export function getRequestActorId(request) {
  return request.authenticatedUser?.id ?? null;
}
