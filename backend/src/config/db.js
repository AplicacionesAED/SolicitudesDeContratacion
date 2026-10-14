// Instancia Sequelize compartida — único lugar del proyecto que construye una
// conexión a Postgres. Todo `.model.js` importa esta misma instancia.
//
// Conexión: DATABASE_URL (un solo enlace, lo usado en producción) o, si no
// está, las variables sueltas PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
require('dotenv').config();
const { Sequelize } = require('sequelize');

const dialectOptions =
  process.env.PGSSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false, dialectOptions })
  : new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      dialect: 'postgres',
      logging: false,
      dialectOptions,
    });

module.exports = sequelize;
