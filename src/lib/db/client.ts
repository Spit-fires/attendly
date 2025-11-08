import { SCHEMA_SQL, type AttendanceStatus } from './schema';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Unified DB client using Capacitor SQLite when available, with sql.js fallback in web dev.

type Row = Record<string, unknown>;

const DB_NAME = 'attendance_db';

let engine: 'capacitor' | 'sqljs' | null = null;
let cap: any;
let sqliteConnection: any;
let dbCap: any; // Capacitor database connection

let sqljs: any;
let dbSqljs: any; // sql.js Database

export async function initDb() {
  if (engine) return; // already initialized

  // Try Capacitor SQLite first (Android target)
  try {
    const mod = await import('@capacitor-community/sqlite');
    cap = mod.CapacitorSQLite ?? (mod as any);
    // Some versions expose SQLiteConnection
    const { SQLiteConnection } = (await import('@capacitor-community/sqlite')) as any;
    sqliteConnection = new SQLiteConnection(cap);
    dbCap = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await dbCap.open();
    await dbCap.execute(SCHEMA_SQL);
    engine = 'capacitor';
    return;
  } catch (_e) {
    // Fallback to sql.js (browser dev)
  }

  try {
    // dynamic import to avoid bundling into native unnecessarily
    // @ts-ignore
    const initSqlJs = (await import('sql.js')).default;
    sqljs = await initSqlJs({});
    dbSqljs = new sqljs.Database();
    dbSqljs.run(SCHEMA_SQL);
    engine = 'sqljs';
  } catch (e) {
    console.error('Failed to initialize any SQL engine', e);
    throw e;
  }
}

export async function run(sql: string, params: unknown[] = []) {
  if (!engine) await initDb();
  if (engine === 'capacitor') {
    return dbCap.run(sql, params);
  } else {
    const stmt = dbSqljs.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  }
}

export async function execute(sql: string) {
  if (!engine) await initDb();
  if (engine === 'capacitor') {
    return dbCap.execute(sql);
  } else {
    dbSqljs.run(sql);
  }
}

export async function query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!engine) await initDb();
  if (engine === 'capacitor') {
    const res = await dbCap.query(sql, params);
    return (res?.values ?? []) as T[];
  } else {
    const stmt = dbSqljs.prepare(sql);
    const rows: T[] = [];
    stmt.bind(params);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push(row as T);
    }
    stmt.free();
    return rows;
  }
}

// Domain helpers
export async function addStudent(name: string) {
  await run('INSERT INTO students (name) VALUES (?)', [name]);
}

export async function listStudents() {
  return query<{ id: number; name: string }>('SELECT id, name FROM students ORDER BY name');
}

export async function getStudent(id: number) {
  const rows = await query<{ id: number; name: string }>('SELECT id, name FROM students WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function updateStudent(id: number, name: string) {
  await run('UPDATE students SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteStudent(id: number) {
  await run('DELETE FROM payments WHERE student_id = ?', [id]);
  await run('DELETE FROM attendance WHERE student_id = ?', [id]);
  await run('DELETE FROM students WHERE id = ?', [id]);
}

export async function upsertAttendance(date: string, studentId: number, status: AttendanceStatus) {
  await run(
    `INSERT INTO attendance (student_id, date, status) VALUES (?,?,?)
     ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status`,
    [studentId, date, status]
  );
}

export async function getAttendanceForDate(date: string) {
  return query<{ id: number; student_id: number; date: string; status: AttendanceStatus }>(
    'SELECT * FROM attendance WHERE date = ?'
    , [date]
  );
}

// Note: finalizeDay marks all unmarked students as "offday" (no class that day)
// This is useful if you want to explicitly mark days when certain students had no class
// but it's optional - leaving students unmarked also means no class that day
export async function finalizeDay(date: string) {
  await run(
    `INSERT INTO attendance (student_id, date, status)
     SELECT s.id, ?, 'offday' FROM students s
     WHERE NOT EXISTS (
       SELECT 1 FROM attendance a WHERE a.student_id = s.id AND a.date = ?
     )`,
    [date, date]
  );
}

export async function getStudentAttendanceHistory(studentId: number) {
  return query<{ date: string; status: AttendanceStatus }>(
    'SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC',
    [studentId]
  );
}

export async function recordPayment(studentId: number, amount: number, date: string, note = '') {
  await run('INSERT INTO payments (student_id, date, amount, note) VALUES (?,?,?,?)', [studentId, date, amount, note]);
}

export async function getPaymentsForDate(date: string) {
  return query<{ id: number; student_id: number; date: string; amount: number; note: string }>(
    'SELECT * FROM payments WHERE date = ? ORDER BY student_id',
    [date]
  );
}

export async function getStudentPayments(studentId: number) {
  return query<{ id: number; date: string; amount: number; note: string }>(
    'SELECT id, date, amount, note FROM payments WHERE student_id = ? ORDER BY date DESC',
    [studentId]
  );
}

export async function getLastPaymentForStudent(studentId: number) {
  const rows = await query<{ date: string; amount: number }>(
    'SELECT date, amount FROM payments WHERE student_id = ? ORDER BY date DESC LIMIT 1',
    [studentId]
  );
  return rows[0] ?? null;
}

export async function deleteAttendanceForDate(studentId: number, date: string) {
  await run('DELETE FROM attendance WHERE student_id = ? AND date = ?', [studentId, date]);
}

export async function deletePaymentForDate(studentId: number, date: string) {
  await run('DELETE FROM payments WHERE student_id = ? AND date = ?', [studentId, date]);
}

// Backup/export in a portable JSON format independent of engine
export async function exportBackup() {
  const students = await query('SELECT * FROM students ORDER BY id');
  const attendance = await query('SELECT * FROM attendance ORDER BY date, student_id');
  const payments = await query('SELECT * FROM payments ORDER BY date, student_id');
  return { version: 1, exported_at: new Date().toISOString(), students, attendance, payments };
}

export async function importBackup(data: any) {
  if (!data || data.version !== 1) throw new Error('Unsupported backup format');
  // naive replace: clear and insert
  await run('DELETE FROM payments');
  await run('DELETE FROM attendance');
  await run('DELETE FROM students');

  // Insert students first to maintain IDs
  for (const s of data.students ?? []) {
    await run('INSERT INTO students (id, name, created_at) VALUES (?,?,?)', [s.id, s.name, s.created_at ?? null]);
  }
  for (const a of data.attendance ?? []) {
    await run('INSERT INTO attendance (id, student_id, date, status) VALUES (?,?,?,?)', [a.id ?? null, a.student_id, a.date, a.status]);
  }
  for (const p of data.payments ?? []) {
    await run('INSERT INTO payments (id, student_id, date, amount, note, created_at) VALUES (?,?,?,?,?,?)', [p.id ?? null, p.student_id, p.date, p.amount, p.note ?? '', p.created_at ?? null]);
  }
}

export function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function exportDb() {
  const backup = await exportBackup();
  const jsonData = JSON.stringify(backup, null, 2);
  const filename = `attendance-backup-${new Date().toISOString().split('T')[0]}.json`;

  // Use Capacitor Filesystem on native platforms
  if (Capacitor.isNativePlatform()) {
    // Write file to Documents directory
    const result = await Filesystem.writeFile({
      path: filename,
      data: jsonData,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    // Share the file so user can save it where they want
    await Share.share({
      title: 'Export Attendance Data',
      text: 'Attendance backup file',
      url: result.uri,
      dialogTitle: 'Save backup file'
    });

    return;
  }

  // Fallback to browser download (web dev only)
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importDb() {
  return new Promise<void>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importBackup(data);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
