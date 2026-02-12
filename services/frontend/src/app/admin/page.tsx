'use client';

import React, { useEffect, useState } from 'react';
import { Users, Tv, TrendingUp, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Admin.module.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/stats');
                if (!res.ok) {
                    if (res.status === 403) throw new Error('Access Denied: Admin role required.');
                    throw new Error('Failed to load dashboard data.');
                }
                const data = await res.json();
                setStats(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className={styles.loading}>Initializing Secure Dashboard...</div>;
    if (error) return <div className={styles.errorContainer}><ShieldCheck size={48} /><h2>{error}</h2></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <Activity className={styles.icon} />
                    <h1>Platform Operations Central</h1>
                </div>
                <div className={styles.statusBadge}>Live Telemetry Active</div>
            </header>

            <div className={styles.statsGrid}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={styles.statCard}>
                    <div className={styles.statIcon}><Users /></div>
                    <div className={styles.statInfo}>
                        <span className={styles.label}>Registered Users</span>
                        <span className={styles.value}>{stats.totalUsers}</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={styles.statCard}>
                    <div className={styles.statIcon}><Tv /></div>
                    <div className={styles.statInfo}>
                        <span className={styles.label}>Active Streams</span>
                        <span className={styles.value}>{stats.activeStreamsCount}</span>
                    </div>
                </motion.div>
            </div>

            <div className={styles.trendingSection}>
                <div className={styles.sectionHeader}>
                    <TrendingUp />
                    <h2>Top Trending Channels</h2>
                </div>
                <div className={styles.trendingList}>
                    {stats.trendingChannels.map((channel: any, idx: number) => (
                        <div key={channel.channelUrl} className={styles.trendingItem}>
                            <span className={styles.rank}>#{idx + 1}</span>
                            <div className={styles.channelName}>{channel.channelName}</div>
                            <div className={styles.watchTime}>
                                {Math.round(channel.totalWatchTime / 60)} mins watched
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
