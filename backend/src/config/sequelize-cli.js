// Config leída por sequelize-cli (migraciones/seeders) -- config/db.js es la
// instancia que usa la app en runtime; sequelize-cli no puede reusar esa
// instancia directamente, necesita este objeto plano por ambiente.
// Misma regla de conexión que db.js: DATABASE_URL si existe, si no PG*.
require('dotenv').config();

const dialectOptions =
  process.env.PGSSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

const base = process.env.DATABASE_URL
  ? { use_env_variable: 'DATABASE_URL', dialect: 'postgres', dialectOptions }
  : {
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      dialect: 'postgres',
      dialectOptions,
    };

module.exports = { development: base, test: base, production: base };
