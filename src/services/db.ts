import { collection, doc, getDocs, getDoc, runTransaction, query, where, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface Reservation {
  id?: string;
  roomId: string;
  date: string;
  periods: number[];
  userId: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  locX: number;
  locY: number;
}

// ================================
// 備品関連の操作
// ================================

/**
 * Firestoreから全ての備品を取得する
 */
export const fetchEquipments = async (): Promise<Equipment[]> => {
  try {
    const q = query(collection(db, 'equipments'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
  } catch (error) {
    console.error("Error fetching equipments:", error);
    return [];
  }
};

// ================================
// 予約関連の操作
// ================================

/**
 * 特定の部屋と日付の予約済みコマを取得する
 */
export const getReservedPeriods = async (roomId: string, date: string): Promise<number[]> => {
  try {
    const q = query(
      collection(db, 'reservations'), 
      where('roomId', '==', roomId),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);
    const periods = new Set<number>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as Reservation;
      data.periods.forEach(p => periods.add(p));
    });
    
    return Array.from(periods);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
};

/**
 * 予約トランザクション（排他制御）
 * 指定したコマがすでに予約されていないか確認し、予約する
 */
export const createReservation = async (reservation: Reservation): Promise<boolean> => {
  try {
    const reservationRef = doc(collection(db, 'reservations'));
    
    await runTransaction(db, async (transaction) => {
      // 同じ日、同じ部屋の予約を全て取得し競合をチェック
      const q = query(
        collection(db, 'reservations'), 
        where('roomId', '==', reservation.roomId),
        where('date', '==', reservation.date)
      );
      
      // 注意: トランザクション内でのクエリの実行には制限があります。
      // 厳密な排他制御のためには、日付+部屋ごとに管理用ドキュメント(DailySchedule等)を用意し、
      // そのドキュメントをトランザクションで読み書きする設計が推奨されます。
      // ここでは設計例として、DailyScheduleドキュメントを用いた排他制御を実装します。
      
      const dailyScheduleRef = doc(db, 'daily_schedules', `${reservation.roomId}_${reservation.date}`);
      const dailyScheduleDoc = await transaction.get(dailyScheduleRef);
      
      let reservedPeriods: number[] = [];
      if (dailyScheduleDoc.exists()) {
        reservedPeriods = dailyScheduleDoc.data().reservedPeriods || [];
      }
      
      // 競合チェック
      const hasConflict = reservation.periods.some(p => reservedPeriods.includes(p));
      if (hasConflict) {
        throw new Error("指定されたコマは既に予約されています。");
      }
      
      // 更新後の予約コマ配列
      const newReservedPeriods = [...reservedPeriods, ...reservation.periods];
      
      // スケジュールを更新
      transaction.set(dailyScheduleRef, { reservedPeriods: newReservedPeriods }, { merge: true });
      
      // 個別予約ドキュメントも保存
      transaction.set(reservationRef, reservation);
    });
    
    return true;
  } catch (error) {
    console.error("Transaction failed: ", error);
    throw error;
  }
};
