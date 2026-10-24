// The app under test talks to a separate database, so tests never touch your working data
process.env.DATABASE_URL = 'postgres://app:app@localhost:5432/tickets_test';
