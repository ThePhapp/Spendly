function logout(request: Request) {
  return Response.redirect(new URL("/cdn-cgi/access/logout", request.url), 303);
}

export const GET = logout;
export const POST = logout;
