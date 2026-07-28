import { useState, useEffect, useMemo } from 'react';
import { PackageSearch, Map, List, MapPin, X, Download } from 'lucide-react';
import styles from './Equipment.module.css';
import { exportToExcel } from '../utils/excelExport';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

type Checkout = { id: string; borrower: string; qty: number; at: string };

type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  floor: number;
  quantity: number;
  locX: number;
  locY: number;
  checkouts: Checkout[];
};

const CATEGORIES = ['すべて', '視聴覚', '理科', '家庭科', '体育', '事務'];

export default function Equipment() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [categoryFilter, setCategoryFilter] = useState('すべて');
  const [activeFloor, setActiveFloor] = useState<number>(1);
  
  const [selectedEq, setSelectedEq] = useState<EquipmentItem | null>(null);
  const [borrower, setBorrower] = useState('');
  const [borrowQty, setBorrowQty] = useState(1);
  
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);

  // リアルタイムリスナー設定
  useEffect(() => {
    const unsubEq = onSnapshot(collection(db, 'equipments'), (snapshot) => {
      const eqData: EquipmentItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        eqData.push({
          id: docSnap.id,
          name: data.name,
          category: data.category,
          location: data.location,
          floor: Number(data.floor),
          quantity: Number(data.quantity),
          locX: Number(data.locX),
          locY: Number(data.locY),
          checkouts: data.checkouts || []
        });
      });
      setEquipments(eqData);
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const tData: string[] = [];
      snapshot.forEach(docSnap => {
        tData.push(docSnap.data().name);
      });
      setTeachers(tData.sort());
      if (tData.length > 0 && !borrower) {
        setBorrower(tData[0]);
      }
    });

    return () => {
      unsubEq();
      unsubTeachers();
    };
  }, []);

  const filteredEquipments = useMemo(() => {
    let list = equipments;
    if (categoryFilter !== 'すべて') {
      list = list.filter(eq => eq.category === categoryFilter);
    }
    return list;
  }, [categoryFilter, equipments]);

  const floorEquipments = filteredEquipments.filter(eq => eq.floor === activeFloor);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, { x: number, y: number, items: EquipmentItem[] }> = {};
    floorEquipments.forEach(eq => {
      if (!groups[eq.location]) {
        groups[eq.location] = { x: eq.locX, y: eq.locY, items: [] };
      }
      groups[eq.location].items.push(eq);
    });
    return groups;
  }, [floorEquipments]);

  const handleBorrow = async () => {
    if (!selectedEq || !borrower) return;
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const newCheckout: Checkout = {
      id: Math.random().toString(),
      borrower,
      qty: borrowQty,
      at: formattedDate
    };

    const docRef = doc(db, 'equipments', selectedEq.id);
    await updateDoc(docRef, {
      checkouts: [...selectedEq.checkouts, newCheckout]
    });
    
    alert(`${selectedEq.name}を ${borrowQty}個、${borrower} が借りました。`);
    setSelectedEq(null);
  };

  const handleReturn = async (eqId: string, checkoutId: string) => {
    if(!window.confirm("この貸出を返却済みにしますか？")) return;
    
    const eq = equipments.find(e => e.id === eqId);
    if(!eq) return;

    const newCheckouts = eq.checkouts.filter(c => c.id !== checkoutId);
    const docRef = doc(db, 'equipments', eqId);
    await updateDoc(docRef, {
      checkouts: newCheckouts
    });
  };

  const handleExport = () => {
    const exportData = equipments.map(eq => {
      const borrowedTotal = eq.checkouts.reduce((sum, c) => sum + c.qty, 0);
      return {
        'カテゴリー': eq.category,
        '備品名': eq.name,
        '保管場所': `${eq.floor}F ${eq.location}`,
        '総数': eq.quantity,
        '貸出中': borrowedTotal,
        '残数': eq.quantity - borrowedTotal,
        '貸出詳細': eq.checkouts.map(c => `${c.borrower}(${c.qty}個)`).join(', ')
      };
    });
    exportToExcel(exportData, '備品貸出状況', [15, 25, 15, 10, 10, 10, 40]);
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <PackageSearch className={styles.titleIcon} size={28} />
          備品検索・貸出
        </h1>
        
        <div className={styles.controls}>
          <button 
            onClick={handleExport}
            style={{display:'flex', alignItems:'center', gap:'8px', background:'var(--surface-color)', border:'1px solid var(--border-color)', color:'var(--text-primary)', padding:'8px 16px', borderRadius:'var(--radius-md)'}}
          >
            <Download size={18} /> Excel出力
          </button>
          
          <select 
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

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
        {viewMode === 'list' ? (
          <div className={styles.listGrid}>
            {filteredEquipments.map(eq => {
              const borrowedTotal = eq.checkouts.reduce((sum, c) => sum + c.qty, 0);
              const remainingQty = eq.quantity - borrowedTotal;

              return (
                <div key={eq.id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemName}>{eq.name}</div>
                    <div className={styles.itemCategory}>{eq.category}</div>
                  </div>
                  <div className={styles.itemLocation}>
                    <MapPin size={16} className="text-gold" />
                    保管場所: {eq.floor}F {eq.location}
                  </div>
                  <div className={styles.itemQuantity}>
                    総数: {eq.quantity} {borrowedTotal > 0 ? `(残り: ${remainingQty})` : ''}
                  </div>
                  
                  <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                    {eq.checkouts.length > 0 && (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px'}}>
                        {eq.checkouts.map(checkout => (
                          <div key={checkout.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)', padding: '8px', borderRadius: 'var(--radius-sm)'}}>
                            <div>
                              <div style={{color: '#ff6b6b', fontSize: '0.9rem', fontWeight: 600}}>
                                貸出中: {checkout.borrower} ({checkout.qty}個)
                              </div>
                              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                                {checkout.at}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleReturn(eq.id, checkout.id)}
                              style={{padding: '6px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)'}}
                            >
                              返却
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {remainingQty > 0 ? (
                      <button 
                        onClick={() => {
                          setSelectedEq(eq);
                          setBorrowQty(1);
                        }}
                        style={{width: '100%', padding: '8px', background: eq.checkouts.length > 0 ? 'var(--surface-color-light)' : 'var(--accent-gold)', border: eq.checkouts.length > 0 ? '1px solid var(--accent-gold)' : 'none', color: eq.checkouts.length > 0 ? 'var(--accent-gold)' : 'var(--bg-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600}}
                      >
                        {eq.checkouts.length > 0 ? 'さらに借りる' : '借りる'}
                      </button>
                    ) : (
                      <div style={{textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '8px', background: 'var(--surface-color-light)', borderRadius: 'var(--radius-sm)'}}>
                        すべて貸出中
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredEquipments.length === 0 && (
              <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
                該当する備品が見つかりません。
              </div>
            )}
          </div>
        ) : (
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
            
            {Object.entries(groupedByLocation).map(([location, data]) => (
              <div 
                key={location}
                className={styles.pin}
                style={{ left: `${data.x}%`, top: `${data.y}%` }}
              >
                <div className={styles.pinIcon}>
                  <PackageSearch size={24} />
                </div>
                <div className={styles.pinLabel}>
                  <div>{location}</div>
                  <div className={styles.pinItemList}>
                    {data.items.length > 2 
                      ? `${data.items[0].name} 他${data.items.length - 1}件` 
                      : data.items.map(i => i.name).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEq && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 17, 32, 0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}} onClick={() => setSelectedEq(null)}>
          <div style={{background: 'var(--surface-color)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
            <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{fontSize: '1.2rem', margin: 0}}>「{selectedEq.name}」を借りる</h2>
              <button onClick={() => setSelectedEq(null)} style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem'}}>
              
              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>借りる人</label>
                {teachers.length === 0 ? (
                  <div style={{color: '#ff6b6b', fontSize: '0.9rem'}}>教職員データがありません。設定からインポートしてください。</div>
                ) : (
                  <select 
                    value={borrower}
                    onChange={e => setBorrower(e.target.value)}
                    style={{width: '100%', padding: '12px', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', fontSize: '1rem', outline: 'none'}}
                  >
                    {teachers.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>
                  数量 (最大: {selectedEq.quantity - selectedEq.checkouts.reduce((sum, c) => sum + c.qty, 0)})
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedEq.quantity - selectedEq.checkouts.reduce((sum, c) => sum + c.qty, 0)} 
                  value={borrowQty}
                  onChange={e => setBorrowQty(Number(e.target.value))}
                  style={{width: '100%', padding: '12px', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', fontSize: '1rem', outline: 'none'}}
                />
              </div>

              <p style={{marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)'}}>
                ※貸出日時は自動的に現在時刻が記録されます。<br/>
                ※時間は特に指定しません。
              </p>
            </div>

            <div style={{padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
              <button onClick={() => setSelectedEq(null)} style={{padding: '10px 20px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)'}}>
                キャンセル
              </button>
              <button 
                onClick={handleBorrow} 
                disabled={teachers.length === 0}
                style={{padding: '10px 20px', background: teachers.length === 0 ? 'var(--surface-color-light)' : 'var(--accent-gold)', border: 'none', color: teachers.length === 0 ? 'var(--text-secondary)' : 'var(--bg-color)', borderRadius: 'var(--radius-md)', fontWeight: 600}}
              >
                貸出を確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
