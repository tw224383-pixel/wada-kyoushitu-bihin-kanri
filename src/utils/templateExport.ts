import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export const downloadExcelTemplate = () => {
  // 1. 備品マスター
  const equipmentsData = [
    {
      "name": "名称 (例: プロジェクター)",
      "category": "カテゴリー (例: 視聴覚)",
      "location": "保管場所 (例: 情報室)",
      "floor": "階 (例: 3)",
      "quantity": "総数 (半角数字, 例: 3)",
      "locX": "マップX座標 (1-100, 空白可)",
      "locY": "マップY座標 (1-100, 空白可)"
    },
    { "name": "プロジェクター", "category": "視聴覚", "location": "情報室", "floor": 3, "quantity": 3, "locX": 20, "locY": 50 },
    { "name": "顕微鏡", "category": "理科", "location": "理科室", "floor": 1, "quantity": 15, "locX": 40, "locY": 30 },
    { "name": "ミシン", "category": "家庭科", "location": "家庭科室", "floor": 1, "quantity": 10, "locX": 60, "locY": 30 },
    { "name": "ビーカーセット", "category": "理科", "location": "理科室", "floor": 1, "quantity": 20, "locX": 40, "locY": 30 },
    { "name": "CDラジカセ", "category": "視聴覚", "location": "音楽室", "floor": 2, "quantity": 2, "locX": 70, "locY": 50 },
    { "name": "ホワイトボード", "category": "事務", "location": "会議室", "floor": 1, "quantity": 1, "locX": 20, "locY": 30 },
    { "name": "とび箱", "category": "体育", "location": "体育館", "floor": 1, "quantity": 5, "locX": 80, "locY": 30 }
  ];

  // 2. 教室マスター
  const roomsData = [
    {
      "id": "識別ID (英数字, 例: meeting)",
      "name": "教室名 (例: 会議室)",
      "floor": "階 (例: 1)",
      "x": "マップX座標 (1-100, 空白可)",
      "y": "マップY座標 (1-100, 空白可)"
    },
    { "id": "meeting", "name": "会議室", "floor": 1, "x": 20, "y": 30 },
    { "id": "science", "name": "理科室", "floor": 1, "x": 40, "y": 30 },
    { "id": "home_ec", "name": "家庭科室", "floor": 1, "x": 60, "y": 30 },
    { "id": "gym", "name": "体育館", "floor": 1, "x": 80, "y": 30 },
    { "id": "consult", "name": "相談室", "floor": 1, "x": 50, "y": 70 },
    { "id": "art", "name": "図工室", "floor": 2, "x": 30, "y": 50 },
    { "id": "music", "name": "音楽室", "floor": 2, "x": 70, "y": 50 },
    { "id": "info", "name": "情報室", "floor": 3, "x": 20, "y": 50 },
    { "id": "library", "name": "図書室", "floor": 3, "x": 50, "y": 50 },
    { "id": "wadakko", "name": "和田っ子ルーム", "floor": 3, "x": 80, "y": 50 }
  ];

  // 3. 教職員マスター
  const teachersData = [
    { "name": "教職員名 (例: 山田太郎)" }
  ];
  for(let i=1; i<=40; i++) {
    teachersData.push({ "name": `先生${i}` });
  }

  // 4. 時間割マスター (初期予約データ)
  const timetableData = [
    {
      "dayOfWeek": "曜日 (例: 月)",
      "period": "時間帯 (例: 1限)",
      "roomName": "教室名 (例: 理科室)",
      "borrower": "使用者・授業名 (例: 5年1組 理科)",
      "abWeek": "A/B週 (A, B, 共通)"
    },
    { "dayOfWeek": "月", "period": "1限", "roomName": "理科室", "borrower": "5年1組 理科", "abWeek": "共通" },
    { "dayOfWeek": "火", "period": "3限", "roomName": "音楽室", "borrower": "4年2組 音楽", "abWeek": "A" },
    { "dayOfWeek": "火", "period": "3限", "roomName": "音楽室", "borrower": "4年1組 音楽", "abWeek": "B" },
    { "dayOfWeek": "水", "period": "レインボータイム", "roomName": "図書室", "borrower": "図書委員", "abWeek": "共通" },
  ];

  // 5. A・B週設定マスター
  const weekMappingsData = [
    {
      "startDate": "開始日 (YYYY/MM/DD)",
      "endDate": "終了日 (YYYY/MM/DD)",
      "weekType": "A/B週 (A または B)"
    },
    { "startDate": "2026/04/06", "endDate": "2026/04/12", "weekType": "A" },
    { "startDate": "2026/04/13", "endDate": "2026/04/19", "weekType": "B" },
    { "startDate": "2026/04/20", "endDate": "2026/04/26", "weekType": "A" }
  ];

  // シート作成
  const wsEquipments = XLSX.utils.json_to_sheet(equipmentsData);
  const wsRooms = XLSX.utils.json_to_sheet(roomsData);
  const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
  const wsTimetable = XLSX.utils.json_to_sheet(timetableData);
  const wsWeekMappings = XLSX.utils.json_to_sheet(weekMappingsData);

  // 幅調整
  wsEquipments['!cols'] = [{wch:25}, {wch:15}, {wch:20}, {wch:10}, {wch:10}, {wch:15}, {wch:15}];
  wsRooms['!cols'] = [{wch:15}, {wch:20}, {wch:10}, {wch:15}, {wch:15}];
  wsTeachers['!cols'] = [{wch:25}];
  wsTimetable['!cols'] = [{wch:15}, {wch:15}, {wch:20}, {wch:30}, {wch:15}];
  wsWeekMappings['!cols'] = [{wch:20}, {wch:20}, {wch:15}];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsEquipments, '備品マスター');
  XLSX.utils.book_append_sheet(workbook, wsRooms, '教室マスター');
  XLSX.utils.book_append_sheet(workbook, wsTeachers, '教職員マスター');
  XLSX.utils.book_append_sheet(workbook, wsTimetable, '時間割マスター');
  XLSX.utils.book_append_sheet(workbook, wsWeekMappings, 'A・B週設定');
  
  XLSX.writeFile(workbook, `和田小学校_初期設定マスター.xlsx`);
};

export const exportCurrentMasterData = async () => {
  try {
    const eqSnap = await getDocs(collection(db, 'equipments'));
    const rmSnap = await getDocs(collection(db, 'rooms'));
    const tSnap = await getDocs(collection(db, 'teachers'));
    const ttSnap = await getDocs(collection(db, 'timetable'));
    const wmSnap = await getDocs(collection(db, 'week_mappings'));

    const equipmentsData = [
      {
        "name": "名称 (例: プロジェクター)",
        "category": "カテゴリー (例: 視聴覚)",
        "location": "保管場所 (例: 情報室)",
        "floor": "階 (例: 3)",
        "quantity": "総数 (半角数字, 例: 3)",
        "locX": "マップX座標 (1-100, 空白可)",
        "locY": "マップY座標 (1-100, 空白可)"
      },
      ...eqSnap.docs.map(doc => {
        const d = doc.data();
        return {
          "name": d.name || "",
          "category": d.category || "",
          "location": d.location || "",
          "floor": d.floor || "",
          "quantity": d.quantity || "",
          "locX": d.locX || "",
          "locY": d.locY || ""
        };
      })
    ];

    const roomsData = [
      {
        "id": "識別ID (英数字, 例: meeting)",
        "name": "教室名 (例: 会議室)",
        "floor": "階 (例: 1)",
        "x": "マップX座標 (1-100, 空白可)",
        "y": "マップY座標 (1-100, 空白可)"
      },
      ...rmSnap.docs.map(doc => {
        const d = doc.data();
        return {
          "id": doc.id || "",
          "name": d.name || "",
          "floor": d.floor || "",
          "x": d.x || "",
          "y": d.y || ""
        };
      })
    ];

    const teachersData = [
      { "name": "教職員名 (例: 山田太郎)" },
      ...tSnap.docs.map(doc => ({ "name": doc.data().name || "" }))
    ];

    const timetableData = [
      {
        "dayOfWeek": "曜日 (例: 月)",
        "period": "時間帯 (例: 1限)",
        "roomName": "教室名 (例: 理科室)",
        "borrower": "使用者・授業名 (例: 5年1組 理科)",
        "abWeek": "A/B週 (A, B, 共通)"
      },
      ...ttSnap.docs.map(doc => {
        const d = doc.data();
        return {
          "dayOfWeek": d.dayOfWeek || "",
          "period": d.period || "",
          "roomName": d.roomName || "",
          "borrower": d.borrower || "",
          "abWeek": d.abWeek || "共通"
        };
      })
    ];

    const weekMappingsData = [
      {
        "startDate": "開始日 (YYYY/MM/DD)",
        "endDate": "終了日 (YYYY/MM/DD)",
        "weekType": "A/B週 (A または B)"
      },
      ...wmSnap.docs.map(doc => {
        const d = doc.data();
        return {
          "startDate": d.startDate || "",
          "endDate": d.endDate || "",
          "weekType": d.weekType || ""
        };
      })
    ];

    // シート作成
    const wsEquipments = XLSX.utils.json_to_sheet(equipmentsData);
    const wsRooms = XLSX.utils.json_to_sheet(roomsData);
    const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
    const wsTimetable = XLSX.utils.json_to_sheet(timetableData);
    const wsWeekMappings = XLSX.utils.json_to_sheet(weekMappingsData);

    // 幅調整
    wsEquipments['!cols'] = [{wch:25}, {wch:15}, {wch:20}, {wch:10}, {wch:10}, {wch:15}, {wch:15}];
    wsRooms['!cols'] = [{wch:15}, {wch:20}, {wch:10}, {wch:15}, {wch:15}];
    wsTeachers['!cols'] = [{wch:25}];
    wsTimetable['!cols'] = [{wch:15}, {wch:15}, {wch:20}, {wch:30}, {wch:15}];
    wsWeekMappings['!cols'] = [{wch:20}, {wch:20}, {wch:15}];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsEquipments, '備品マスター');
    XLSX.utils.book_append_sheet(workbook, wsRooms, '教室マスター');
    XLSX.utils.book_append_sheet(workbook, wsTeachers, '教職員マスター');
    XLSX.utils.book_append_sheet(workbook, wsTimetable, '時間割マスター');
    XLSX.utils.book_append_sheet(workbook, wsWeekMappings, 'A・B週設定');
    
    XLSX.writeFile(workbook, `和田小学校_現在のマスターデータ.xlsx`);
  } catch (error) {
    console.error("Error exporting current master data:", error);
    alert("データのエクスポート中にエラーが発生しました。");
  }
};
