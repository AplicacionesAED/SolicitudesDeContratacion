// Config leída por sequelize-cli (migraciones/seeders) -- config/db.js es la
// instancia que usa la app en runtime; sequelize-cli no puede reusar esa
// instancia directamente, necesita este objeto plano por ambiente.
require('dotenv').config();

const base = {
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  dialect: 'postgres',
  dialectOptions:
    process.env.PGSSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
};

module.exports = { development: base, test: base, production: base };
