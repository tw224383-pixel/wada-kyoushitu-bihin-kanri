import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <LayoutDashboard className={styles.brandIcon} />
          <span>和田小学校教室・備品管理システム</span>
        </Link>
        <div className={styles.actions}>
          <Link to="/admin" className={styles.iconButton} aria-label="設定">
            <Settings size={20} />
          </Link>
        </div>
      </header>
      
      <main className={styles.main}>
        <div className="container" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        作成：黒田　異動後の保守点検はできません
      </footer>
    </div>
  );
}
