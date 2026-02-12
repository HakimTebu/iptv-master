'use client';

import React, { useMemo } from 'react';
import { Play, Star, ShieldAlert, Search, Activity, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext, Channel } from '@/context/AppContext';
import styles from './ChannelGrid.module.css';

export default function ChannelGrid() {
    const {
        groups, selectedGroup, searchQuery, favorites, toggleFavorite,
        setCurrentChannel, healthStatus, isHealthChecking, healthCheckProgress, runHealthCheck
    } = useAppContext();

    const filteredChannels = useMemo(() => {
        let channels: Channel[] = [];
        if (selectedGroup) {
            const group = groups.find(g => g.slug === selectedGroup);
            if (group) channels = group.channels;
        } else {
            channels = groups.flatMap(g => g.channels);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            channels = channels.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.group.toLowerCase().includes(query) ||
                c.category.toLowerCase().includes(query)
            );
        }

        return channels;
    }, [groups, selectedGroup, searchQuery]);

    const onlineCount = filteredChannels.filter(c => healthStatus[c.url] === 'online').length;
    const offlineCount = filteredChannels.filter(c => healthStatus[c.url] === 'offline').length;
    const hasHealthData = Object.keys(healthStatus).length > 0;

    return (
        <div className={styles.container}>
            <header className={styles.gridHeader}>
                <h1 className={styles.title}>
                    {selectedGroup ? groups.find(g => g.slug === selectedGroup)?.name : 'All Channels'}
                    <span className={styles.count}>
                        {filteredChannels.length} channels
                        {hasHealthData && (
                            <> • <span className={styles.onlineText}>{onlineCount} online</span> • <span className={styles.offlineText}>{offlineCount} offline</span></>
                        )}
                    </span>
                </h1>
                <button
                    className={`${styles.healthCheckBtn} ${isHealthChecking ? styles.checking : ''}`}
                    onClick={runHealthCheck}
                    disabled={isHealthChecking}
                >
                    <Activity size={16} className={isHealthChecking ? styles.pulseIcon : ''} />
                    {isHealthChecking
                        ? `Checking ${healthCheckProgress.checked}/${healthCheckProgress.total}...`
                        : 'Check Health'
                    }
                </button>
            </header>

            {isHealthChecking && (
                <div className={styles.progressBar}>
                    <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${healthCheckProgress.total > 0 ? (healthCheckProgress.checked / healthCheckProgress.total) * 100 : 0}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            )}

            <div className={styles.grid}>
                <AnimatePresence mode="popLayout">
                    {filteredChannels.map((channel, index) => {
                        const status = healthStatus[channel.url];
                        return (
                            <motion.div
                                key={channel.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.01, duration: 0.2 }}
                                className={`${styles.card} glass ${status === 'offline' ? styles.cardOffline : ''}`}
                                onClick={() => setCurrentChannel(channel)}
                            >
                                <div className={styles.cardImage}>
                                    {channel.logo ? (
                                        <img src={channel.logo} alt={channel.name} loading="lazy" />
                                    ) : (
                                        <div className={styles.logoFallback}>{channel.name[0]}</div>
                                    )}
                                    <div className={styles.cardOverlay}>
                                        <button className={styles.playButton}>
                                            <Play fill="currentColor" size={24} />
                                        </button>
                                    </div>
                                    {channel.isHD && <span className={styles.hdBadge}>HD</span>}
                                    {channel.isGeoBlocked && <span className={styles.geoBadge} title="Geo-blocked"><ShieldAlert size={12} /></span>}

                                    {/* Health Status Badge */}
                                    {status === 'online' && (
                                        <span className={styles.statusBadge + ' ' + styles.statusOnline} title="Online">
                                            <Wifi size={10} /> Live
                                        </span>
                                    )}
                                    {status === 'offline' && (
                                        <span className={styles.statusBadge + ' ' + styles.statusOffline} title="Offline">
                                            <WifiOff size={10} /> Offline
                                        </span>
                                    )}
                                    {status === 'checking' && (
                                        <span className={styles.statusBadge + ' ' + styles.statusChecking} title="Checking...">
                                            <Activity size={10} className={styles.pulseIcon} /> ...
                                        </span>
                                    )}
                                </div>
                                <div className={styles.cardInfo}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.channelName}>{channel.name}</h3>
                                        <button
                                            className={`${styles.favButton} ${favorites.includes(channel.id) ? styles.isFav : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(channel.id);
                                            }}
                                        >
                                            <Star size={16} fill={favorites.includes(channel.id) ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                    <p className={styles.category}>{channel.category}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredChannels.length === 0 && (
                <div className={styles.emptyState}>
                    <Search size={48} />
                    <h3>No channels found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
}
