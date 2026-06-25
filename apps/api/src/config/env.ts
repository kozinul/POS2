export const env = {
  PORT: process.env.PORT || '5000',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/pos2',
};
