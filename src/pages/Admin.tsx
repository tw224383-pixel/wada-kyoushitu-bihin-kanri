import { useState } from 'react';
import { UploadCloud, Settings, Database, Download } from 'lucide-react';
import { importEquipmentsFromExcel } from '../utils/excelImport';
import { downloadExcelTemplate, exportCurrentMasterData } from '../utils/templateExport';
import styles from './Reservation.module.css'; // Reusing some base styles

export default function Admin() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const pwd = prompt("マスターデータのインポートにはパスワードが必要です。\nパスワードを入力してください:");
      if (pwd !== "wada8817") {
        alert("パスワードが違います。");
        e.target.value = '';
        return;
      }
      
      try {
        setIsUploading(true);
        setMessage('アップロード中...');
        await importEquipmentsFromExcel(file);
        setMessage('インポートが完了しました。');
      } catch (error) {
        console.error(error);
        setMessage('エラーが発生しました。コンソールをご確認ください。');
      } finally {
        setIsUploading(false);
        e.target.value = ''; // reset
      }
    }
  };

  return (
    <div className={`${styles.container} animate-fade-in`} style={{ maxWidth: '800px', paddingTop: '2rem' }}>
      <header className={styles.header} style={{ marginBottom: '2rem' }}>
        <h1 className={styles.title}>
          <Settings className={styles.titleIcon} size={28} />
          管理者設定 (マスターデータ登録)
        </h1>
      </header>

      <div className={styles.contentArea} style={{ padding: '2rem', minHeight: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={20} className="text-gold" />
              Excelからのデータインポート
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
              年度初めの時間割データや、教室・備品のマスターデータをExcel（.xlsx）から一括インポートします。<br/>
              ※「備品マスター」という名前のシートが含まれている必要があります。
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button 
                onClick={downloadExcelTemplate}
                style={{display:'inline-flex', alignItems:'center', gap:'8px', background:'var(--surface-color-light)', border:'1px solid var(--text-secondary)', color:'var(--text-secondary)', padding:'8px 16px', borderRadius:'var(--radius-md)', fontWeight: 600, cursor: 'pointer'}}
              >
                <Download size={18} /> 空のテンプレートをダウンロード
              </button>
              
              <button 
                onClick={exportCurrentMasterData}
                style={{display:'inline-flex', alignItems:'center', gap:'8px', background:'var(--accent-gold)', border:'1px solid var(--accent-gold)', color:'var(--bg-color)', padding:'8px 16px', borderRadius:'var(--radius-md)', fontWeight: 600, cursor: 'pointer'}}
              >
                <Download size={18} /> 現在のマスターデータを出力する
              </button>
            </div>
            
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--surface-color-light)',
              transition: 'all var(--transition-fast)'
            }}>
              <UploadCloud size={48} className="text-gold" style={{ marginBottom: '1rem' }} />
              <div style={{ marginBottom: '1.5rem', fontWeight: '500' }}>
                Excelファイルをドラッグ＆ドロップ、または選択してください
              </div>
              
              <label style={{
                background: 'var(--accent-gold)',
                color: 'var(--bg-color)',
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                ファイルを選択
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
            
            {message && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                background: message.includes('エラー') ? 'rgba(133, 0, 0, 0.2)' : 'rgba(212, 175, 55, 0.1)',
                color: message.includes('エラー') ? '#ff6b6b' : 'var(--accent-gold)'
              }}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
