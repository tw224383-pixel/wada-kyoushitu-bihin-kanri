import { Link } from 'react-router-dom';
import { CalendarDays, PackageSearch } from 'lucide-react';
import styles from './Home.module.css';

export default function Home() {
  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.hero}>
        <h1 className={styles.title} style={{fontSize: '2.5rem'}}>
          <span className="text-gradient">和田小学校</span><br/>教室・備品管理システム
        </h1>
        <p className={styles.subtitle}>
          校内の特別教室や備品を、直感的な操作でスムーズに検索・予約できます。
          用途に合わせてメニューを選択してください。
        </p>
      </div>

      <div className={styles.grid}>
        <Link to="/reservation" className={styles.tile}>
          <div className={styles.iconWrapper}>
            <CalendarDays size={40} />
          </div>
          <h2 className={styles.tileTitle}>教室利用予約</h2>
          <p className={styles.tileDesc}>
            特別教室（情報室、理科室など）の空き状況を確認し、
            日時を指定して利用予約を行います。
          </p>
        </Link>

        <Link to="/equipment" className={styles.tile}>
          <div className={styles.iconWrapper}>
            <PackageSearch size={40} />
          </div>
          <h2 className={styles.tileTitle}>備品検索</h2>
          <p className={styles.tileDesc}>
            校内にある教材や備品の保管場所を
            マップやリストから素早く検索します。
          </p>
        </Link>
      </div>
    </div>
  );
}
