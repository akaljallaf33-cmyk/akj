import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DATABASE_URL.replace('ssl-mode=REQUIRED', 'ssl=true'));
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

console.log('Connected to database');

// Check if data already exists
const [rows] = await connection.execute('SELECT COUNT(*) as count FROM well_jobs');
const count = rows[0].count;
console.log(`Current well_jobs count: ${count}`);

if (count > 0) {
  console.log('Data already exists, skipping seed');
  await connection.end();
  process.exit(0);
}

console.log('Inserting seed data...');

// Insert well_jobs
await connection.execute(`
  INSERT INTO well_jobs (id, serviceLine, platform, wellNumber, unit, jobType, startDate, endDate, productionBefore, productionAfter, production30Days, status, notes, ct1DailyRate, operationalDays, badWeatherDays, onRig, rigDailyRate, rigOperationalDays, rigBadWeatherDays, jobBill) VALUES
  (30001, 'coiled-tubing', '1', '1', 'CT-1', 'SCO + PP + N2', '2026-01-14', '2026-01-17', 100, 200, 180, 'Successful', '', 17500, 3, 1, 0, NULL, NULL, NULL, 50000),
  (30002, 'coiled-tubing', '2', '2', 'CT-2', 'SCO + PP', '2026-02-11', '2026-02-11', 100, 200, 180, 'Successful', '', NULL, NULL, NULL, 0, NULL, NULL, NULL, 20000),
  (60001, 'coiled-tubing', '3', '3', 'CT-1', 'SCO', '2026-02-17', '2026-02-17', 180, 150, 120, 'Partially Successful', 'integrity issue', 17500, 5, 0, 0, NULL, NULL, NULL, 65000),
  (90001, 'coiled-tubing', 'ZHD-A', '103A', 'CT-2', 'Acid Wash', '2026-03-11', '2026-03-14', 101, 120, 120, 'Successful', '', NULL, NULL, NULL, 0, NULL, NULL, NULL, 30000),
  (90002, 'wireline', 'LAM-13', '118A', '', 'AP', '2026-03-02', '2026-03-03', 100, 150, 150, 'Successful', '', NULL, NULL, NULL, 0, NULL, NULL, NULL, 15000),
  (120001, 'coiled-tubing', 'LAM-4', '4', 'CT-2', 'SCO', '2026-03-04', '2026-03-06', 100, 250, NULL, 'Successful', '', NULL, NULL, NULL, 0, NULL, NULL, NULL, 80000)
`);
console.log('well_jobs inserted');

// Insert oil_prices
await connection.execute(`
  INSERT INTO oil_prices (id, month, avgPrice) VALUES
  (1, '2026-01', 65),
  (2, '2026-02', 67),
  (3, '2026-03', 71)
`);
console.log('oil_prices inserted');

// Insert well_plans
await connection.execute(`
  INSERT INTO well_plans (id, year, platform, wellNumber, serviceLine, plannedJobType, expectedRecovery, plannedDate, notes) VALUES
  (1, 2026, 'LAM-4', '4', 'coiled-tubing', 'SCO', 100, '2026-03-04', NULL),
  (2, 2026, 'LAM-10', '110', 'coiled-tubing', 'SCO', 100, '2026-03-27', NULL)
`);
console.log('well_plans inserted');

await connection.end();
console.log('Seed completed successfully!');
