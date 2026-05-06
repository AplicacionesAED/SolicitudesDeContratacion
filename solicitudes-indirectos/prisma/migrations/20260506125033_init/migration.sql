-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "telefono" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'SOLICITANTE',
    "roles" TEXT NOT NULL DEFAULT '["SOLICITANTE"]',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "proyectoId" INTEGER NOT NULL,

    CONSTRAINT "Frente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrenteUsuario" (
    "userId" TEXT NOT NULL,
    "frenteId" INTEGER NOT NULL,

    CONSTRAINT "FrenteUsuario_pkey" PRIMARY KEY ("userId","frenteId")
);

-- CreateTable
CREATE TABLE "AprobadorFrente" (
    "id" SERIAL NOT NULL,
    "frenteId" INTEGER NOT NULL,
    "aprobadorId" TEXT NOT NULL,

    CONSTRAINT "AprobadorFrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tercero" (
    "id" SERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "tipoContrato" TEXT NOT NULL,
    "confidencialidad" BOOLEAN NOT NULL DEFAULT false,
    "dd_identificacionContraparte" BOOLEAN NOT NULL DEFAULT false,
    "dd_consultaListasRestrictivas" BOOLEAN NOT NULL DEFAULT false,
    "dd_verificacionPep" BOOLEAN NOT NULL DEFAULT false,
    "dd_conocimientoNegocio" BOOLEAN NOT NULL DEFAULT false,
    "dd_monitoreoActualizacion" BOOLEAN NOT NULL DEFAULT false,
    "dd_senalesAlertaReporte" BOOLEAN NOT NULL DEFAULT false,
    "aprobadoDebidaDiligencia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tercero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" SERIAL NOT NULL,
    "consecutivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solicitanteId" TEXT NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "frentesIds" TEXT NOT NULL DEFAULT '[]',
    "terceroId" INTEGER,
    "descripcionActividad" TEXT,
    "plazoEjecucion" TEXT,
    "formaPago" TEXT,
    "valorFinal" DECIMAL(65,30),
    "tipoContrato" TEXT,
    "asunto" TEXT,
    "creacionTercero" BOOLEAN DEFAULT false,
    "contratanteNombre" TEXT DEFAULT 'AED CONSTRUCTORES S.A.S',
    "contratanteNit" TEXT DEFAULT '901237628-1',
    "alcance" TEXT,
    "condicionesEspeciales" TEXT,
    "valorEnLetras" TEXT,
    "docTerminosReferencia" BOOLEAN NOT NULL DEFAULT false,
    "docCamaraComercio" BOOLEAN NOT NULL DEFAULT false,
    "docEstadosFinancieros" BOOLEAN NOT NULL DEFAULT false,
    "docEstadoResultados" BOOLEAN NOT NULL DEFAULT false,
    "docSagrilaft" BOOLEAN NOT NULL DEFAULT false,
    "docComposicionAccionaria" BOOLEAN NOT NULL DEFAULT false,
    "docRut" BOOLEAN NOT NULL DEFAULT false,
    "docCedulaRepresentante" BOOLEAN NOT NULL DEFAULT false,
    "docCertificacionBancaria" BOOLEAN NOT NULL DEFAULT false,
    "docCotizacion" BOOLEAN NOT NULL DEFAULT false,
    "archivoCuadroComparativo" TEXT,
    "archivoCotizacion" TEXT,
    "archivoFormatoSolicitud" TEXT,
    "archivoBEP" TEXT,
    "archivosAnexos" TEXT NOT NULL DEFAULT '[]',
    "aprobadorId" TEXT,
    "fechaAprobacionDirector" TIMESTAMP(3),
    "notaContratacion" TEXT,
    "necesitaRevision" BOOLEAN NOT NULL DEFAULT false,
    "numeroContratoAdpro" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialSolicitud" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialSolicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronogramaContrato" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "tieneFases" BOOLEAN NOT NULL DEFAULT false,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronogramaContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaseCronograma" (
    "id" SERIAL NOT NULL,
    "cronogramaId" INTEGER NOT NULL,
    "numeroFase" INTEGER NOT NULL,
    "nombreFase" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaseCronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadCronograma" (
    "id" SERIAL NOT NULL,
    "cronogramaId" INTEGER NOT NULL,
    "faseId" INTEGER,
    "descripcion" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "responsable" TEXT,

    CONSTRAINT "ActividadCronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContadorConsecutivo" (
    "tipo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContadorConsecutivo_pkey" PRIMARY KEY ("tipo")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AprobadorFrente_frenteId_key" ON "AprobadorFrente"("frenteId");

-- CreateIndex
CREATE UNIQUE INDEX "Tercero_razonSocial_key" ON "Tercero"("razonSocial");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitud_consecutivo_key" ON "Solicitud"("consecutivo");

-- CreateIndex
CREATE UNIQUE INDEX "CronogramaContrato_solicitudId_key" ON "CronogramaContrato"("solicitudId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frente" ADD CONSTRAINT "Frente_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrenteUsuario" ADD CONSTRAINT "FrenteUsuario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrenteUsuario" ADD CONSTRAINT "FrenteUsuario_frenteId_fkey" FOREIGN KEY ("frenteId") REFERENCES "Frente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprobadorFrente" ADD CONSTRAINT "AprobadorFrente_frenteId_fkey" FOREIGN KEY ("frenteId") REFERENCES "Frente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "Tercero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialSolicitud" ADD CONSTRAINT "HistorialSolicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialSolicitud" ADD CONSTRAINT "HistorialSolicitud_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CronogramaContrato" ADD CONSTRAINT "CronogramaContrato_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaseCronograma" ADD CONSTRAINT "FaseCronograma_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "CronogramaContrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadCronograma" ADD CONSTRAINT "ActividadCronograma_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "CronogramaContrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadCronograma" ADD CONSTRAINT "ActividadCronograma_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "FaseCronograma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
