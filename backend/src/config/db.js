// Instancia Sequelize compartida — único lugar del proyecto que construye una
// conexión a Postgres. Todo `.model.js` importa esta misma instancia.
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.PGDATABASE,
  process.env.PGUSER,
  process.env.PGPASSWORD,
  {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      process.env.PGSSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
  }
);

module.exports = sequelize;
