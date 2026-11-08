export const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((val) => val.trim())
      .filter(Boolean)
  : ['http://localhost:5173'];
