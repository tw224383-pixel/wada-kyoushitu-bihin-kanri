import * as XLSX from 'xlsx';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Excelファイルから3つのマスターデータ（備品、教室、教職員）を読み込み、Firestoreへ一括保存する
 */
export const importEquipmentsFromExcel = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const clearCollection = async (collName: string) => {
          const snap = await getDocs(collection(db, collName));
          if (snap.empty) return;
          const deleteBatch = writeBatch(db);
          snap.docs.forEach(d => deleteBatch.delete(d.ref));
          await deleteBatch.commit();
        };

        if (workbook.SheetNames.includes("備品マスター")) await clearCollection('equipments');
        if (workbook.SheetNames.includes("教室マスター")) await clearCollection('rooms');
        if (workbook.SheetNames.includes("教職員マスター")) await clearCollection('teachers');
        if (workbook.SheetNames.includes("時間割マスター")) await clearCollection('timetable');
        if (workbook.SheetNames.includes("A・B週設定")) await clearCollection('week_mappings');

        const batch = writeBatch(db);
        
        // 1. 備品マスターのインポート
        if (workbook.SheetNames.includes("備品マスター")) {
          const ws = workbook.Sheets["備品マスター"];
          const json = XLSX.utils.sheet_to_json<any>(ws);
          const colRef = collection(db, 'equipments');
          
          json.forEach((item, index) => {
            if(index === 0) return; // 1行目は説明なのでスキップ
            const newDocRef = doc(colRef);
            batch.set(newDocRef, {
              name: item.name || '名称不明',
              category: item.category || '未分類',
              location: item.location || '不明',
              floor: item.floor || 1,
              quantity: item.quantity || 1,
              locX: item.locX || 50,
              locY: item.locY || 50
            });
          });
        }

        // 2. 教室マスターのインポート
        if (workbook.SheetNames.includes("教室マスター")) {
          const ws = workbook.Sheets["教室マスター"];
          const json = XLSX.utils.sheet_to_json<any>(ws);
          const colRef = collection(db, 'rooms');
          
          json.forEach((item, index) => {
            if(index === 0) return; // 1行目スキップ
            const newDocRef = doc(colRef, item.id); // 指定IDを使用
            batch.set(newDocRef, {
              name: item.name,
              floor: item.floor || 1,
              x: item.x || 50,
              y: item.y || 50
            });
          });
        }

        // 3. 教職員マスターのインポート
        if (workbook.SheetNames.includes("教職員マスター")) {
          const ws = workbook.Sheets["教職員マスター"];
          const json = XLSX.utils.sheet_to_json<any>(ws);
          const colRef = collection(db, 'teachers');
          
          json.forEach((item, index) => {
            if(index === 0) return; // 1行目スキップ
            const newDocRef = doc(colRef);
            batch.set(newDocRef, {
              name: item.name
            });
          });
        }
        
        // 4. 時間割マスターのインポート
        if (workbook.SheetNames.includes("時間割マスター")) {
          const ws = workbook.Sheets["時間割マスター"];
          const json = XLSX.utils.sheet_to_json<any>(ws);
          const colRef = collection(db, 'timetable');
          
          json.forEach((item, index) => {
            if(index === 0) return; // 1行目スキップ
            const newDocRef = doc(colRef);
            batch.set(newDocRef, {
              dayOfWeek: item.dayOfWeek,
              period: item.period,
              roomName: item.roomName,
              borrower: item.borrower,
              abWeek: item.abWeek || '共通'
            });
          });
        }
        // 5. A・B週設定のインポート
        if (workbook.SheetNames.includes("A・B週設定")) {
          const ws = workbook.Sheets["A・B週設定"];
          const json = XLSX.utils.sheet_to_json<any>(ws, { raw: false });
          const colRef = collection(db, 'week_mappings');
          
          json.forEach((item, index) => {
            if(index === 0) return; // 1行目スキップ
            const newDocRef = doc(colRef);
            batch.set(newDocRef, {
              startDate: item.startDate,
              endDate: item.endDate,
              weekType: item.weekType
            });
          });
        }
        
        await batch.commit();
        console.log("Batch commit for: Equipments, Rooms, Teachers, Timetable, WeekMappings completed.");
        
        resolve();
      } catch (err) {
        console.error("Excel import error:", err);
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
