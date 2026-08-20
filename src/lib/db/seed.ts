/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Seed — Données initiales pour Daniélou Abidjan.
 * Exécuter : pnpm db:seed
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import {
  school, academicYear, academicPeriod, level, subject,
  assessmentType, user,
} from './schema';
import { eq } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL!;
const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

async function seed() {
  console.log('Seeding database...');

  // 1. École
  const [existingSchool] = await db.select().from(school).limit(1);
  let schoolId: string;
  if (existingSchool) {
    schoolId = existingSchool.id;
  } else {
    const [created] = await db.insert(school).values({
      name: 'Complexe Scolaire Daniélou',
      address: 'Cocody Riviera Palmeraie',
      city: 'Abidjan',
      country: "Côte d'Ivoire",
      logoUrl: '/branding/danielou-abidjan-logo.png',
    }).returning();
    schoolId = created.id;
  }
  console.log(`  School: ${schoolId}`);

  // 2. Année scolaire
  const [existingYear] = await db.select().from(academicYear)
    .where(eq(academicYear.schoolId, schoolId)).limit(1);
  let yearId: string;
  if (existingYear) {
    yearId = existingYear.id;
  } else {
    const [created] = await db.insert(academicYear).values({
      schoolId: schoolId,
      name: '2026-2027',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2027-06-30'),
      status: 'active',
    }).returning();
    yearId = created.id;
  }
  console.log(`  Year: ${yearId}`);

  // 3. Périodes (trimestres)
  const periodValues = [
    { academicYearId: yearId, name: '1er Trimestre', startDate: new Date('2026-09-15'), endDate: new Date('2026-12-18'), sortOrder: 1, status: 'draft' as const },
    { academicYearId: yearId, name: '2ème Trimestre', startDate: new Date('2027-01-08'), endDate: new Date('2027-03-27'), sortOrder: 2, status: 'draft' as const },
    { academicYearId: yearId, name: '3ème Trimestre', startDate: new Date('2027-04-12'), endDate: new Date('2027-06-30'), sortOrder: 3, status: 'draft' as const },
  ];
  await db.insert(academicPeriod).values(periodValues).onConflictDoNothing();
  console.log(`  ${periodValues.length} periods`);

  // 4. Niveaux
  const niveaux = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'];
  await db.insert(level).values(
    niveaux.map((name, i) => ({ schoolId, name, sortOrder: i + 1 }))
  ).onConflictDoNothing();
  console.log(`  ${niveaux.length} levels`);

  // 5. Matières
  const matieres = [
    { code: 'FRA', name: 'Français', coefficient: '5', defaultScale: 20 },
    { code: 'MAT', name: 'Mathématiques', coefficient: '5', defaultScale: 20 },
    { code: 'ANG', name: 'Anglais', coefficient: '3', defaultScale: 20 },
    { code: 'ESP', name: 'Espagnol', coefficient: '2', defaultScale: 20 },
    { code: 'HIS', name: 'Histoire-Géographie', coefficient: '3', defaultScale: 20 },
    { code: 'SCI', name: 'Sciences de la Vie et de la Terre', coefficient: '3', defaultScale: 20 },
    { code: 'PHY', name: 'Physique-Chimie', coefficient: '3', defaultScale: 20 },
    { code: 'EPS', name: 'EPS', coefficient: '2', defaultScale: 20 },
    { code: 'ART', name: 'Arts Plastiques', coefficient: '2', defaultScale: 20 },
    { code: 'MUS', name: 'Éducation Musicale', coefficient: '1', defaultScale: 20 },
    { code: 'ECM', name: 'Éducation Civique et Morale', coefficient: '1', defaultScale: 20 },
    { code: 'INF', name: 'Informatique', coefficient: '2', defaultScale: 20 },
  ];
  await db.insert(subject).values(
    matieres.map((m) => ({
      schoolId,
      code: m.code,
      name: m.name,
      coefficient: m.coefficient,
      defaultScale: m.defaultScale,
      isActive: true,
      isOptional: false,
      includeInAverage: true,
      includeInRanking: true,
      includeInDecision: true,
    }))
  ).onConflictDoNothing();
  console.log(`  ${matieres.length} subjects`);

  // 6. Types d'évaluation
  const types = [
    { name: 'Devoir', description: 'Devoir en classe' },
    { name: 'Examen', description: 'Examen de fin de période' },
    { name: 'Contrôle', description: 'Contrôle surprise' },
    { name: 'TP', description: 'Travaux pratiques' },
  ];
  await db.insert(assessmentType).values(
    types.map((t) => ({ schoolId, name: t.name, description: t.description }))
  ).onConflictDoNothing();
  console.log(`  ${types.length} assessment types`);

  // 7. Utilisateur admin
  const adminEmail = 'admin@danielou.ci';
  const [existingAdmin] = await db.select().from(user)
    .where(eq(user.email, adminEmail)).limit(1);
  if (!existingAdmin) {
    await db.insert(user).values({
      email: adminEmail,
      name: 'Administrateur',
      role: 'admin',
      isActive: true,
    });
    console.log(`  Admin created: ${adminEmail}`);
  } else {
    console.log(`  Admin exists: ${adminEmail}`);
  }

  console.log('Seed completed successfully!');
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
