import { useState, useMemo, Fragment, useEffect } from 'react';
import { CalendarDays, Map, List, MapPin, X, Download, ChevronLeft, ChevronRight, ListOrdered } from 'lucide-react';
import styles from './Reservation.module.css';
import { exportToExcel } from '../utils/excelExport';
import { db } from '../firebase';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';

const PERIODS = [
  { id: 1, name: '1限' },
  { id: 2, name: '2限' },
  { id: 3, name: '3限' },
  { id: 4, name: '4限' },
  { id: 5, name: '5限' },
  { id: 7, name: 'レインボータイム' },
  { id: 6, name: '6限' },
];

type Room = { id: string; name: string; floor: number; x: number; y: number };
type TimetableEntry = { id: string; dayOfWeek: string; period: string; roomName: string; borrower: string; abWeek?: string };
type ReservationData = { id: string; roomId: string; date: string; periodId: number; borrower: string };
type WeekMapping = { id: string; startDate: string; endDate: string; weekType: string };

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export default function Reservation() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [weekMappings, setWeekMappings] = useState<WeekMapping[]>([]);
  
  const [showList, setShowList] = useState(false);
  const [selectedCells, setSelectedCells] = useState<{date: string, periodId: number}[]>([]);
  const [borrower, setBorrower] = useState('');

  // リアルタイムリスナー設定
  useEffect(() => {
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      const t = snap.docs.map(d => d.data().name);
      setTeachers(t.sort());
      if(t.length > 0) setBorrower(t[0]);
    });
    const unsubTimetables = onSnapshot(collection(db, 'timetable'), (snap) => {
      setTimetables(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)));
    });
    const unsubReservations = onSnapshot(collection(db, 'reservations'), (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReservationData)));
    });
    const unsubWeekMappings = onSnapshot(collection(db, 'week_mappings'), (snap) => {
      setWeekMappings(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekMapping)));
    });

    return () => {
      unsubRooms();
      unsubTeachers();
      unsubTimetables();
      unsubReservations();
      unsubWeekMappings();
    };
  }, []);

  const floorRooms = rooms.filter(r => r.floor === activeFloor);

  const weekDays = useMemo(() => {
    const days = [];
    const jpDays = ['日','月','火','水','木','金','土'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = jpDays[d.getDay()];
      const label = `${d.getMonth()+1}/${d.getDate()} (${dayName})`;
      days.push({ dateStr, label, dayName });
    }
    return days;
  }, [currentWeekStart]);

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
    setSelectedCells([]);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
    setSelectedCells([]);
  };

  const currentWeekType = useMemo(() => {
    const currentMs = currentWeekStart.getTime();
    for (const mapping of weekMappings) {
      if (!mapping.startDate || !mapping.endDate) continue;
      const start = new Date(mapping.startDate.replace(/\//g, '-')).getTime();
      const end = new Date(mapping.endDate.replace(/\//g, '-')).getTime();
      if (currentMs >= start && currentMs <= end) {
        return mapping.weekType;
      }
    }
    return '';
  }, [currentWeekStart, weekMappings]);

  const getTimetableForCell = (dayName: string, periodName: string, roomName: string) => {
    return timetables.find(t => 
      t.dayOfWeek === dayName && 
      t.period === periodName && 
      t.roomName === roomName &&
      (!t.abWeek || t.abWeek === '共通' || t.abWeek === currentWeekType)
    );
  };

  const toggleCellSelection = (dateStr: string, periodId: number, isOccupied: boolean) => {
    if (isOccupied) {
      const pwd = prompt("この枠は既に予約・時間割が登録されています。\n強制的に割り込み予約をしますか？\nパスワード:");
      if (pwd !== "wada8817") {
        if (pwd !== null) alert("パスワードが違います。");
        return;
      }
    }

    const exists = selectedCells.find(c => c.date === dateStr && c.periodId === periodId);
    if (exists) {
      setSelectedCells(prev => prev.filter(c => !(c.date === dateStr && c.periodId === periodId)));
    } else {
      setSelectedCells(prev => [...prev, { date: dateStr, periodId }]);
    }
  };

  const handleReserve = async () => {
    if (!selectedRoom || selectedCells.length === 0 || !borrower) return;
    
    const batch = writeBatch(db);
    const colRef = collection(db, 'reservations');

    // For all selected cells, first find and delete any existing reservations to act as an override.
    for (const cell of selectedCells) {
      const existing = reservations.find(r => r.roomId === selectedRoom.id && r.date === cell.date && r.periodId === cell.periodId);
      if (existing) {
        batch.delete(doc(db, 'reservations', existing.id));
      }
      
      const newRef = doc(colRef);
      batch.set(newRef, {
        roomId: selectedRoom.id,
        date: cell.date,
        periodId: cell.periodId,
        borrower: borrower
      });
    }

    await batch.commit();
    alert(`${selectedCells.length}枠を ${borrower} で予約（上書き含む）しました。`);
    setSelectedCells([]);
  };

  const handleExport = () => {
    const exportData = [...reservations].sort((a, b) => {
      if(a.date !== b.date) return a.date.localeCompare(b.date);
      return a.periodId - b.periodId;
    }).map(r => {
      const room = rooms.find(rm => rm.id === r.roomId);
      const period = PERIODS.find(p => p.id === r.periodId);
      return {
        '利用日': r.date,
        '時間帯': period ? period.name : '',
        '教室名': room ? `${room.floor}F ${room.name}` : '',
        '予約者': r.borrower
      };
    });
    
    exportToExcel(exportData, '予約状況一覧', [15, 15, 20, 20]);
  };

  const renderCalendarCell = (day: {dateStr: string, dayName: string}, period: {id: number, name: string}) => {
    if (!selectedRoom) return null;
    
    const existingRes = reservations.find(r => r.roomId === selectedRoom.id && r.date === day.dateStr && r.periodId === period.id);
    const existingTime = getTimetableForCell(day.dayName, period.name, selectedRoom.name);
    
    const isOccupied = !!existingRes || !!existingTime;
    const isSelected = selectedCells.some(c => c.date === day.dateStr && c.periodId === period.id);
    
    let content = '-';
    if (isSelected) {
      content = '選択中';
    } else if (existingRes) {
      content = `予約済\n${existingRes.borrower}`;
    } else if (existingTime) {
      content = `時間割\n${existingTime.borrower}`;
    }

    return (
      <div 
        onClick={() => toggleCellSelection(day.dateStr, period.id, isOccupied)}
        style={{
          background: isSelected ? 'var(--accent-gold)' : (isOccupied ? 'rgba(255, 107, 107, 0.15)' : 'var(--surface-color-light)'),
          color: isSelected ? 'var(--bg-color)' : (isOccupied ? '#ff6b6b' : 'var(--text-primary)'),
          cursor: 'pointer',
          padding: '8px 4px',
          height: '100%',
          borderRadius: '4px',
          textAlign: 'center',
          transition: 'all 0.2s',
          border: isSelected ? '1px solid var(--accent-gold)' : (isOccupied ? '1px solid rgba(255,107,107,0.5)' : '1px solid var(--border-color)'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'pre-wrap',
          fontSize: '0.8rem',
          fontWeight: isOccupied ? 'bold' : 'normal'
        }}>
        {content}
      </div>
    );
  };

  const roomReservations = selectedRoom 
    ? [...reservations].filter(r => r.roomId === selectedRoom.id).sort((a, b) => {
        if(a.date !== b.date) return a.date.localeCompare(b.date);
        return a.periodId - b.periodId;
      })
    : [];

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <CalendarDays className={styles.titleIcon} size={28} />
          教室利用予約
        </h1>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <button 
            onClick={handleExport}
            style={{display:'flex', alignItems:'center', gap:'8px', background:'var(--surface-color)', border:'1px solid var(--border-color)', color:'var(--text-primary)', padding:'8px 16px', borderRadius:'var(--radius-md)'}}
          >
            <Download size={18} /> 予約リスト出力
          </button>
          <div className={styles.toggleGroup}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.active : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Map size={18} /> マップ
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} /> リスト
            </button>
          </div>
        </div>
      </header>

      <div className={styles.contentArea}>
        {rooms.length === 0 ? (
          <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            マスターデータがありません。設定からインポートしてください。
          </div>
        ) : (
          <>
            {viewMode === 'map' ? (
              <div className={styles.mapContainer}>
                <div className={styles.mapOverlay} />
                <div className={styles.floorTabs}>
                  {[1, 2, 3].map(floor => (
                    <button
                      key={floor}
                      className={`${styles.floorTabBtn} ${activeFloor === floor ? styles.active : ''}`}
                      onClick={() => setActiveFloor(floor)}
                    >
                      {floor}F
                    </button>
                  ))}
                </div>
                
                {floorRooms.map(room => (
                  <div 
                    key={room.id}
                    className={styles.pin}
                    style={{ left: `${room.x}%`, top: `${room.y}%` }}
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowList(false);
                    }}
                  >
                    <div className={styles.pinIcon}>
                      <MapPin size={24} />
                    </div>
                    <div className={styles.pinLabel}>{room.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.listGrid}>
                {[...rooms].sort((a, b) => a.floor - b.floor).map(room => (
                  <div 
                    key={room.id}
                    className={styles.roomCard}
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowList(false);
                    }}
                  >
                    <div className={styles.roomIcon}>
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3>{room.name}</h3>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{room.floor}F</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedRoom && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRoom(null)}>
          <div className={styles.modalContent} style={{maxWidth: '900px'}} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                {selectedRoom.name}
              </h2>
              <button onClick={() => setSelectedRoom(null)} className={styles.iconButton}>
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody} style={{padding: '1.5rem'}}>
              {showList ? (
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{margin: 0}}>今後の予約一覧</h3>
                    <button 
                      onClick={() => setShowList(false)}
                      style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', padding: '8px 16px', background: 'var(--accent-gold)', border: 'none', color: 'var(--bg-color)', borderRadius: 'var(--radius-md)', fontWeight: 'bold'}}
                    >
                      <CalendarDays size={20} /> カレンダー表示に戻る
                    </button>
                  </div>
                  
                  {roomReservations.length === 0 ? (
                    <p style={{color: 'var(--text-secondary)'}}>現在、予約は入っていません。</p>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                      {roomReservations.map(r => {
                        const period = PERIODS.find(p => p.id === r.periodId);
                        return (
                          <div key={r.id} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--surface-color-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)'}}>
                            <div style={{fontWeight: 'bold'}}>
                              {r.date} <span style={{color: 'var(--text-secondary)', marginLeft: '8px'}}>{period?.name}</span>
                            </div>
                            <div style={{color: 'var(--accent-gold)', fontWeight: 'bold'}}>{r.borrower}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <button onClick={handlePrevWeek} style={{padding: '8px', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px'}}>
                      <ChevronLeft size={20} /> 前の週
                    </button>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <input 
                        type="month" 
                        value={`${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}`}
                        onChange={(e) => {
                          if(!e.target.value) return;
                          const [y, m] = e.target.value.split('-');
                          const date = new Date(Number(y), Number(m) - 1, 1);
                          while (date.getDay() !== 1) {
                            date.setDate(date.getDate() + 1);
                          }
                          setCurrentWeekStart(date);
                          setSelectedCells([]);
                        }}
                        style={{padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color-light)', color: 'var(--text-primary)', fontSize: '1rem'}}
                      />
                      <h3 style={{margin: 0}}>
                        {weekDays[0].label} 〜 {weekDays[4].label}
                        {currentWeekType && <span style={{color: 'var(--accent-gold)', marginLeft: '8px'}}>【{currentWeekType}週】</span>}
                      </h3>
                      <button 
                        onClick={() => setShowList(true)}
                        style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', padding: '8px 16px', background: 'var(--accent-gold)', border: 'none', color: 'var(--bg-color)', borderRadius: 'var(--radius-md)', fontWeight: 'bold', marginLeft: '1rem'}}
                      >
                        <ListOrdered size={20} /> 予約済み一覧を見る
                      </button>
                    </div>
                    <button onClick={handleNextWeek} style={{padding: '8px', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px'}}>
                      次の週 <ChevronRight size={20} />
                    </button>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '90px repeat(5, 1fr)', gap: '8px'}}>
                    <div />
                    {weekDays.map(day => (
                      <div key={day.dateStr} style={{textAlign: 'center', fontWeight: 'bold', padding: '8px 0', background: 'var(--surface-color-light)', borderRadius: '4px'}}>
                        {day.label}
                      </div>
                    ))}

                    {PERIODS.map(p => (
                      <Fragment key={p.id}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: 'var(--surface-color-light)', borderRadius: '4px', fontSize: '0.9rem'}}>
                          {p.name}
                        </div>
                        {weekDays.map(day => (
                          <div key={`${day.dateStr}-${p.id}`} style={{minHeight: '60px'}}>
                            {renderCalendarCell(day, p)}
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter} style={{alignItems: 'center', justifyContent: 'space-between'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                {!showList && (
                  <>
                    <span style={{color: 'var(--text-secondary)'}}>予約者:</span>
                    {teachers.length === 0 ? (
                      <span style={{color: '#ff6b6b'}}>教職員データなし</span>
                    ) : (
                      <select 
                        value={borrower}
                        onChange={e => setBorrower(e.target.value)}
                        style={{padding: '8px 12px', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)'}}
                      >
                        {teachers.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </>
                )}
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <button className={`${styles.btn} ${styles.btnCancel}`} onClick={() => setSelectedRoom(null)}>
                  閉じる
                </button>
                {!showList && (
                  <button 
                    className={`${styles.btn} ${styles.btnPrimary}`} 
                    disabled={selectedCells.length === 0 || teachers.length === 0}
                    onClick={handleReserve}
                  >
                    予約を確定する ({selectedCells.length}枠)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
