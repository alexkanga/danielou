/**
 * M6.3 — Bulletin PDF Generation
 * Generates professional PDF from published report card snapshot.
 * Uses PDFKit — real PDF download, not browser print.
 */

import PDFDocument from 'pdfkit';
import { db } from '@/lib/db';
import {
  reportCard, reportCardItem, enrollment, student,
  classroom, level, academicPeriod, academicYear, school,
  classroomAssignment,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface BulletinData {
  schoolName: string;
  schoolCity: string;
  schoolLogoUrl: string | null;
  academicYear: string;
  periodName: string;
  studentName: string;
  studentMatricule: string | null;
  classroomName: string;
  levelName: string;
  generalAverageOfficial: string | null;
  classAverage: string | null;
  rank: number | null;
  totalRanked: number | null;
  conductGrade: string | null;
  conductComment: string | null;
  teacherComment: string | null;
  directorComment: string | null;
  generalAppreciation: string | null;
  items: Array<{
    subjectName: string;
    subjectCode: string | null;
    coefficient: string | null;
    officialValue: string | null;
    classAverage: string | null;
    minAverage: string | null;
    maxAverage: string | null;
    teacherAppreciation: string | null;
    isIncomplete: boolean;
    sortOrder: number;
  }>;
}

// ─────────────────────────────────────────────
// Data fetch
// ─────────────────────────────────────────────

export async function getBulletinData(reportCardId: string): Promise<BulletinData | null> {
  const [rc] = await db
    .select()
    .from(reportCard)
    .where(eq(reportCard.id, reportCardId))
    .limit(1);

  if (!rc) return null;

  const [enr] = await db
    .select()
    .from(enrollment)
    .where(eq(enrollment.id, rc.enrollmentId))
    .limit(1);

  if (!enr) return null;

  const [stu] = await db
    .select()
    .from(student)
    .where(eq(student.id, enr.studentId))
    .limit(1);

  if (!stu) return null;

  // Get classroom via assignment
  const assignments = await db
    .select({ classroomId: classroomAssignment.classroomId })
    .from(classroomAssignment)
    .where(and(
      eq(classroomAssignment.enrollmentId, enr.id),
      eq(classroomAssignment.status, 'active'),
    ))
    .limit(1);

  let classroomName = '';
  let levelName = '';

  if (assignments.length > 0) {
    const [c] = await db
      .select({ name: classroom.name })
      .from(classroom)
      .where(eq(classroom.id, assignments[0].classroomId))
      .limit(1);
    classroomName = c?.name ?? '';

    const [l] = await db
      .select({ name: level.name })
      .from(level)
      .innerJoin(classroom, eq(level.id, classroom.levelId))
      .where(eq(classroom.id, assignments[0].classroomId))
      .limit(1);
    levelName = l?.name ?? '';
  }

  const [period] = await db
    .select({ name: academicPeriod.name })
    .from(academicPeriod)
    .where(eq(academicPeriod.id, rc.academicPeriodId))
    .limit(1);

  const [year] = await db
    .select({ name: academicYear.name })
    .from(academicYear)
    .where(eq(academicYear.id, enr.academicYearId))
    .limit(1);

  const [sch] = await db
    .select({ name: school.name, city: school.city, logoUrl: school.logoUrl })
    .from(school)
    .limit(1);

  const items = await db
    .select()
    .from(reportCardItem)
    .where(eq(reportCardItem.reportCardId, reportCardId))
    .orderBy(reportCardItem.sortOrder);

  return {
    schoolName: sch?.name ?? '',
    schoolCity: sch?.city ?? 'Abidjan',
    schoolLogoUrl: sch?.logoUrl ?? null,
    academicYear: year?.name ?? '',
    periodName: period?.name ?? '',
    studentName: `${stu.lastName} ${stu.firstName}`,
    studentMatricule: stu.matricule,
    classroomName,
    levelName,
    generalAverageOfficial: rc.generalAverageOfficial ? String(rc.generalAverageOfficial) : null,
    classAverage: rc.classAverage ? String(rc.classAverage) : null,
    rank: rc.rank,
    totalRanked: rc.totalStudentsRanked,
    conductGrade: rc.conductGrade ? String(rc.conductGrade) : null,
    conductComment: rc.conductComment,
    teacherComment: rc.teacherComment,
    directorComment: rc.directorComment,
    generalAppreciation: rc.generalAppreciation,
    items: items.map(i => ({
      subjectName: i.subjectName,
      subjectCode: i.subjectCode,
      coefficient: i.coefficient ? String(i.coefficient) : null,
      officialValue: i.officialValue ? String(i.officialValue) : null,
      classAverage: i.classAverage ? String(i.classAverage) : null,
      minAverage: i.minAverage ? String(i.minAverage) : null,
      maxAverage: i.maxAverage ? String(i.maxAverage) : null,
      teacherAppreciation: i.teacherAppreciation,
      isIncomplete: i.isIncomplete,
      sortOrder: i.sortOrder,
    })),
  };
}

// ─────────────────────────────────────────────
// PDF Generation
// ─────────────────────────────────────────────

export function generateBulletinPdf(data: BulletinData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = doc.page.width - 80;

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text(data.schoolName, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(data.schoolCity, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text(`Ann\u00e9e scolaire : ${data.academicYear}    |    P\u00e9riode : ${data.periodName}`, { align: 'center' });
    doc.moveDown(1);

    // Student info
    doc.fontSize(11).font('Helvetica-Bold').text(`\u00c9l\u00e8ve : ${data.studentName}`);
    if (data.studentMatricule) {
      doc.fontSize(9).font('Helvetica').text(`Matricule : ${data.studentMatricule}`);
    }
    doc.fontSize(9).text(`Classe : ${data.classroomName}    |    Niveau : ${data.levelName}`);
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const colWidths = [W * 0.35, W * 0.12, W * 0.10, W * 0.10, W * 0.10, W * 0.23];
    const headers = ['Mati\u00e8re', 'Coeff.', 'Note/20', 'Moy. Cl.', 'Min/Max', 'Appr\u00e9ciation'];

    doc.rect(40, tableTop - 2, W, 16).fill('#0060A0');
    doc.fill('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    let x = 40;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + 4, tableTop + 2, { width: colWidths[i] - 8, align: 'center' });
      x += colWidths[i];
    }
    doc.fill('#000000');
    doc.y = tableTop + 18;

    // Table rows
    doc.font('Helvetica').fontSize(8);
    for (let idx = 0; idx < data.items.length; idx++) {
      const item = data.items[idx];
      if (doc.y > 680) {
        doc.addPage();
        doc.y = 60;
      }

      const rowY = doc.y;
      if (idx % 2 === 1) {
        doc.rect(40, rowY - 2, W, 14).fill('#F5F7FA');
        doc.fill('#000000');
      }

      const vals = [
        item.subjectName,
        item.coefficient ?? '-',
        item.isIncomplete ? 'INC' : (item.officialValue ?? '-'),
        item.classAverage ?? '-',
        item.minAverage && item.maxAverage ? `${item.minAverage}/${item.maxAverage}` : '-',
        item.teacherAppreciation ?? '',
      ];

      x = 40;
      for (let i = 0; i < vals.length; i++) {
        const align = i === 0 ? 'left' : 'center';
        doc.text(String(vals[i]), x + 4, rowY + 1, { width: colWidths[i] - 8, align });
        x += colWidths[i];
      }

      doc.y = rowY + 16;
    }

    // Summary
    doc.moveDown(1);
    doc.y += 10;
    if (data.generalAverageOfficial) {
      doc.fontSize(10).font('Helvetica-Bold').text(`Moyenne g\u00e9n\u00e9rale : ${data.generalAverageOfficial}/20`, 40);
    }
    if (data.rank && data.totalRanked) {
      doc.fontSize(9).font('Helvetica').text(`Rang : ${data.rank}/${data.totalRanked}`, 40);
    }
    if (data.classAverage) {
      doc.fontSize(9).text(`Moyenne de la classe : ${data.classAverage}/20`, 40);
    }

    // Comments
    if (data.conductGrade) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').text(`Conduite : ${data.conductGrade}/20`, 40);
    }
    if (data.conductComment) {
      doc.fontSize(8).font('Helvetica').text(data.conductComment, 40, doc.y, { width: W });
    }
    if (data.generalAppreciation) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').text('Appr\u00e9ciation g\u00e9n\u00e9rale :', 40);
      doc.fontSize(9).font('Helvetica').text(data.generalAppreciation, 40, doc.y, { width: W });
    }
    if (data.teacherComment) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').text('Observations du professeur :', 40);
      doc.fontSize(8).font('Helvetica').text(data.teacherComment, 40, doc.y, { width: W });
    }
    if (data.directorComment) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').text('Observations du directeur :', 40);
      doc.fontSize(8).font('Helvetica').text(data.directorComment, 40, doc.y, { width: W });
    }

    // Signature areas
    if (doc.y < 650) doc.moveDown(3);
    const sigY = doc.y;
    doc.fontSize(8).font('Helvetica');
    doc.text('Le Professeur', 80, sigY + 20, { width: 150, align: 'center' });
    doc.moveTo(80, sigY + 16).lineTo(230, sigY + 16).stroke('#000000');
    doc.text('Le Directeur', W - 230, sigY + 20, { width: 150, align: 'center' });
    doc.moveTo(W - 230, sigY + 16).lineTo(W - 80, sigY + 16).stroke('#000000');

    doc.end();
  });
}
