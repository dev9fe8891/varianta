const COOKIE_NAME = "access_token";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, getCookieOptions());
};

export { COOKIE_NAME, setAuthCookie, clearAuthCookie };
