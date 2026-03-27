import { registerAs } from "@nestjs/config";

export default registerAs("auth", () => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error(
      "JWT_REFRESH_SECRET must be set and at least 32 characters",
    );
  }

  return {
    jwtSecret,
    jwtRefreshSecret,
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  };
});
