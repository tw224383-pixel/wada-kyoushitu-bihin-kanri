import * as XLSX from 'xlsx';
import { readRows, SHEET_NAMES } from '../src/utils/excelRows.ts';
import { normalizeDateStr, getMonday, toDateStr } from '../src/utils/date.ts';

const wb = XLSX.utils.book_new();

const add = (name: string, rows: Record<string, unknown>[]) => {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
};

add(SHEET_NAMES.equipments, [
  { name: '名称 (例: プロジェクター)', category: 'カテゴリー (例: 視聴覚)', location: '保管場所 (例: 情報室)', floor: '階 (例: 3)', quantity: '総数 (半角数字, 例: 3)', locX: 'マップX座標 (1-100, 空白可)', locY: 'マップY座標 (1-100, 空白可)' },
  { name: 'プロジェクター', category: '視聴覚', location: '情報室', floor: 3, quantity: 3, locX: 20, locY: 50 },
  { name: '', category: '', location: '', floor: '', quantity: '', locX: '', locY: '' }, // 空行
  { name: '顕微鏡', category: '理科', location: '理科室', floor: '1', quantity: '15', locX: 40, locY: 30 },
]);

add(SHEET_NAMES.rooms, [
  { id: '識別ID (英数字, 例: meeting)', name: '教室名 (例: 会議室)', floor: '階 (例: 1)', x: '', y: '' },
  { id: 'meeting', name: '会議室', floor: 1, x: 20, y: 30 },
  { id: 'meeting', name: '重複ID', floor: 1, x: 20, y: 30 },
  { id: '', name: 'ID無し', floor: 1, x: 20, y: 30 },
]);

add(SHEET_NAMES.teachers, [
  { name: '教職員名 (例: 山田太郎)' },
  ...Array.from({ length: 40 }, (_, i) => ({ name: `先生${i + 1}` })),
]);

// ヘッダーに余分な空白が入っているケース
add(SHEET_NAMES.timetable, [
  { 'dayOfWeek ': '曜日 (例: 月)', period: '時間帯 (例: 1限)', roomName: '教室名 (例: 理科室)', borrower: '使用者・授業名 (例: 5年1組 理科)', abWeek: 'A/B週 (A, B, 共通)' },
  { 'dayOfWeek ': '月', period: '1限', roomName: '理科室', borrower: '5年1組 理科', abWeek: '共通' },
]);

add(SHEET_NAMES.weekMappings, [
  { startDate: '開始日 (YYYY/MM/DD)', endDate: '終了日 (YYYY/MM/DD)', weekType: 'A/B週 (A または B)' },
  { startDate: '2026/04/06', endDate: '2026/04/12', weekType: 'A' },
  { startDate: 46113, endDate: 46119, weekType: 'B' }, // Excelのシリアル値
]);

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
};

const eq = readRows(wb, SHEET_NAMES.equipments);
check('備品: 説明行と空行を除外', eq.map(r => r.data.name), ['プロジェクター', '顕微鏡']);
check('備品: Excel上の行番号', eq.map(r => r.rowNumber), [3, 5]);

const rooms = readRows(wb, SHEET_NAMES.rooms);
check('教室: データ行数', rooms.length, 3);

check('教職員: データ行数', readRows(wb, SHEET_NAMES.teachers).length, 40);

const tt = readRows(wb, SHEET_NAMES.timetable);
check('時間割: ヘッダー空白の正規化', tt.map(r => r.data.dayOfWeek), ['月']);

const wm = readRows(wb, SHEET_NAMES.weekMappings);
check('A/B週: 説明行(YYYY/MM/DD)を除外', wm.length, 2);
check('A/B週: 日付の正規化', wm.map(r => normalizeDateStr(r.data.startDate)), ['2026-04-06', '2026-04-01']);

// 日付ユーティリティ: JST午前中でもUTCへずれないこと
check('月曜日の算出 (木曜 8/27)', toDateStr(getMonday(new Date(2026, 7, 27, 8, 30))), '2026-08-24');
check('月曜日の算出 (日曜 8/30)', toDateStr(getMonday(new Date(2026, 7, 30, 0, 5))), '2026-08-24');
check('月曜日の算出 (月曜 0:10)', toDateStr(getMonday(new Date(2026, 7, 24, 0, 10))), '2026-08-24');

console.log(failures === 0 ? '\nすべて成功' : `\n${failures}件 失敗`);
process.exit(failures === 0 ? 0 : 1);
