// Datos de demo -- mismo dataset que prisma/seed.ts de la app Next.js
// original (2 proyectos, 10 frentes, los 7 usuarios de negocio + admin,
// asignaciones de frente y AprobadorFrente) para poder probar Configuración
// (Fase 2) con algo realista. Idempotente (upsert por email/nombre único).
'use strict';

const bcrypt = require('bcryptjs');

const PROYECTOS = [
  { nombre: 'Baia Kristal' },
  { nombre: 'Oliv' },
];

const FRENTES = [
  { nombre: 'KALIZA 1', proyecto: 'Baia Kristal' },
  { nombre: 'KALIZA 2', proyecto: 'Baia Kristal' },
  { nombre: 'KALIZA 3', proyecto: 'Baia Kristal' },
  { nombre: 'KALIZA 4', proyecto: 'Baia Kristal' },
  { nombre: 'KALA 1', proyecto: 'Baia Kristal' },
  { nombre: 'KALA 2', proyecto: 'Baia Kristal' },
  { nombre: 'KALA 3', proyecto: 'Baia Kristal' },
  { nombre: 'KALA 4', proyecto: 'Baia Kristal' },
  { nombre: 'LIVA', proyecto: 'Oliv' },
  { nombre: 'SEIVA', proyecto: 'Oliv' },
];

const USUARIOS = [
  { nombre: 'Stefania Mercado Mejía', cargo: 'Analista de Proyectos', email: 'smercado@baiak.com', telefono: '3005264631', roles: ['SOLICITANTE'], password: 'Abc123!', frentes: ['KALIZA 1', 'KALIZA 2'] },
  { nombre: 'Carlos Rodríguez Peña', cargo: 'Director de Proyecto – KALIZA', email: 'crodriguez@baiak.com', telefono: '3001112233', roles: ['DIRECTOR_PROYECTO'], password: 'Abc123!', frentes: ['KALIZA 1', 'KALIZA 2', 'KALIZA 3', 'KALIZA 4'] },
  { nombre: 'Valentina Torres Ruiz', cargo: 'Director de Proyecto – KALA', email: 'vtorres@baiak.com', telefono: '3104445566', roles: ['DIRECTOR_PROYECTO'], password: 'Abc123!', frentes: ['KALA 1', 'KALA 2', 'KALA 3', 'KALA 4'] },
  { nombre: 'Andrés Morales Gómez', cargo: 'Coordinador de Contratos', email: 'amorales@baiak.com', telefono: '3157778899', roles: ['CONTRATOS'], password: 'Abc123!', frentes: [] },
  { nombre: 'Laura Jiménez Castro', cargo: 'Coordinador de Controles y Costos', email: 'ljimenez@baiak.com', telefono: '3168889900', roles: ['CONTROLES'], password: 'Abc123!', frentes: [] },
  { nombre: 'Miguel Ángel Suárez', cargo: 'Director de Controles', email: 'msuarez@baiak.com', telefono: '3119990011', roles: ['DIRECTOR_CONTROLES'], password: 'Abc123!', frentes: [] },
  { nombre: 'Ana Lucía Vargas', cargo: 'Analista de Contratación', email: 'avargas@baiak.com', telefono: '3002223344', roles: ['SOLICITANTE'], password: 'Abc123!', frentes: ['KALA 1', 'KALA 2'] },
];

const APROBADORES_FRENTE = [
  { frentes: ['KALIZA 1', 'KALIZA 2', 'KALIZA 3', 'KALIZA 4'], aprobadorEmail: 'crodriguez@baiak.com' },
  { frentes: ['KALA 1', 'KALA 2', 'KALA 3', 'KALA 4'], aprobadorEmail: 'vtorres@baiak.com' },
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();

    // Proyectos
    const proyectoIdPorNombre = {};
    for (const p of PROYECTOS) {
      const [existentes] = await queryInterface.sequelize.query('SELECT id FROM proyectos WHERE nombre = :nombre', { replacements: { nombre: p.nombre } });
      if (existentes.length > 0) {
        proyectoIdPorNombre[p.nombre] = existentes[0].id;
        continue;
      }
      const [inserted] = await queryInterface.sequelize.query(
        'INSERT INTO proyectos (nombre, activo, creado_en, actualizado_en) VALUES (:nombre, true, :ahora, :ahora) RETURNING id',
        { replacements: { nombre: p.nombre, ahora } }
      );
      proyectoIdPorNombre[p.nombre] = inserted[0].id;
    }

    // Frentes
    const frenteIdPorNombre = {};
    for (const f of FRENTES) {
      const [existentes] = await queryInterface.sequelize.query('SELECT id FROM frentes WHERE nombre = :nombre', { replacements: { nombre: f.nombre } });
      if (existentes.length > 0) {
        frenteIdPorNombre[f.nombre] = existentes[0].id;
        continue;
      }
      const [inserted] = await queryInterface.sequelize.query(
        'INSERT INTO frentes (nombre, proyecto_id, creado_en, actualizado_en) VALUES (:nombre, :proyectoId, :ahora, :ahora) RETURNING id',
        { replacements: { nombre: f.nombre, proyectoId: proyectoIdPorNombre[f.proyecto], ahora } }
      );
      frenteIdPorNombre[f.nombre] = inserted[0].id;
    }

    // Usuarios + asignación de frentes
    const usuarioIdPorEmail = {};
    for (const u of USUARIOS) {
      const [existentes] = await queryInterface.sequelize.query('SELECT id FROM usuarios WHERE email = :email', { replacements: { email: u.email } });
      let usuarioId;
      if (existentes.length > 0) {
        usuarioId = existentes[0].id;
      } else {
        const hashed = await bcrypt.hash(u.password, 10);
        const [inserted] = await queryInterface.sequelize.query(
          `INSERT INTO usuarios (email, nombre, hashed_password, roles, funcionalidades_adicionales, cargo, telefono, activo, debe_cambiar_password, creado_en, actualizado_en)
           VALUES (:email, :nombre, :hashed, :roles, '[]', :cargo, :telefono, true, false, :ahora, :ahora) RETURNING id`,
          { replacements: { email: u.email, nombre: u.nombre, hashed, roles: JSON.stringify(u.roles), cargo: u.cargo, telefono: u.telefono, ahora } }
        );
        usuarioId = inserted[0].id;
      }
      usuarioIdPorEmail[u.email] = usuarioId;

      for (const nombreFrente of u.frentes) {
        const frenteId = frenteIdPorNombre[nombreFrente];
        if (!frenteId) continue;
        await queryInterface.sequelize.query(
          'INSERT INTO frente_usuarios (usuario_id, frente_id) VALUES (:usuarioId, :frenteId) ON CONFLICT DO NOTHING',
          { replacements: { usuarioId, frenteId } }
        );
      }
    }

    // AprobadorFrente (Director de Proyecto por frente)
    for (const config of APROBADORES_FRENTE) {
      const aprobadorId = usuarioIdPorEmail[config.aprobadorEmail];
      if (!aprobadorId) continue;
      for (const nombreFrente of config.frentes) {
        const frenteId = frenteIdPorNombre[nombreFrente];
        if (!frenteId) continue;
        const [existentes] = await queryInterface.sequelize.query('SELECT id FROM aprobador_frentes WHERE frente_id = :frenteId', { replacements: { frenteId } });
        if (existentes.length > 0) continue;
        // 2026-09-02 "eliminar permisos de rol para solicitudes": cada slot de
        // AprobadorFrente es {usuarios, roles} -- ver
        // 20260831000510-reshape-aprobador-frente.js. director_tecnico/
        // controles_adpro se dejan en su default de columna (roles
        // ['DIRECTOR_TECNICO']/['CONTROLES']), no hace falta poblarlos acá.
        await queryInterface.sequelize.query(
          `INSERT INTO aprobador_frentes (frente_id, director_proyecto, contratos_tramite, contratos_minuta, director_controles, creado_en, actualizado_en)
           VALUES (:frenteId, :directorProyecto, :slotVacio, :slotVacio, :slotVacio, :ahora, :ahora)`,
          { replacements: { frenteId, directorProyecto: JSON.stringify({ usuarios: [aprobadorId], roles: [] }), slotVacio: JSON.stringify({ usuarios: [], roles: [] }), ahora } }
        );
      }
    }
  },
};
