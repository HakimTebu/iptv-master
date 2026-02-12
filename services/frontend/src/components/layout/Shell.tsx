'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Tv, Menu, X, Star, History, ChevronDown, LogOut, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useAppContext } from '@/context/AppContext';
import { getFlag } from '@/lib/country-flags';
import styles from './Shell.module.css';

export default function Shell({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [regionSearch, setRegionSearch] = useState('');
    const { groups, selectedGroup, setSelectedGroup, searchQuery, setSearchQuery } = useAppContext();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedGroupData = groups.find(g => g.slug === selectedGroup);

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(regionSearch.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
                setRegionSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <motion.aside
                className={`${styles.sidebar} glass`}
                initial={false}
                animate={{ width: isSidebarOpen ? 'var(--sidebar-width)' : '80px' }}
            >
                <div className={styles.logoContainer}>
                    <Tv className={styles.logoIcon} />
                    {isSidebarOpen && <span className={styles.logoText}>IPTV <span className={styles.logoAccent}>PRO</span></span>}
                </div>

                <nav className={styles.nav}>
                    <div className={styles.sectionTitle}>{isSidebarOpen ? 'Library' : '•'}</div>
                    <button className={styles.navItem}>
                        <Star size={20} />
                        {isSidebarOpen && <span>Favorites</span>}
                    </button>
                    <button className={styles.navItem}>
                        <History size={20} />
                        {isSidebarOpen && <span>Recent</span>}
                    </button>

                    {isSidebarOpen && (
                        <>
                            <div className={styles.sectionTitle}>Region</div>
                            <div className={styles.dropdownWrapper} ref={dropdownRef}>
                                <button
                                    className={styles.dropdownTrigger}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    <span className={styles.dropdownFlag}>
                                        {selectedGroupData ? getFlag(selectedGroupData.name) : '🌐'}
                                    </span>
                                    <span className={styles.dropdownLabel}>
                                        {selectedGroupData?.name || 'Select Region'}
                                    </span>
                                    <span className={styles.dropdownCount}>
                                        {selectedGroupData?.channels.length || 0}
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        className={`${styles.dropdownChevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            className={styles.dropdownMenu}
                                            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <div className={styles.dropdownSearch}>
                                                <Search size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search regions..."
                                                    value={regionSearch}
                                                    onChange={e => setRegionSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className={styles.dropdownList}>
                                                {filteredGroups.map(group => (
                                                    <button
                                                        key={group.slug}
                                                        className={`${styles.dropdownItem} ${selectedGroup === group.slug ? styles.dropdownItemActive : ''}`}
                                                        onClick={() => {
                                                            setSelectedGroup(group.slug);
                                                            setIsDropdownOpen(false);
                                                            setRegionSearch('');
                                                        }}
                                                    >
                                                        <span className={styles.itemFlag}>{getFlag(group.name)}</span>
                                                        <span className={styles.itemName}>{group.name}</span>
                                                        <span className={styles.itemCount}>{group.channels.length}</span>
                                                    </button>
                                                ))}
                                                {filteredGroups.length === 0 && (
                                                    <div className={styles.dropdownEmpty}>No regions found</div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </nav>
            </motion.aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={`${styles.header} glass`}>
                    <div className={styles.headerLeft}>
                        <button className={styles.iconButton} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className={styles.searchBar}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search 1000s of channels..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        {session ? (
                            <div className={styles.userProfile}>
                                <div className={styles.avatar}>
                                    {session.user?.image ? (
                                        <img src={session.user.image} alt="" className={styles.avatarImg} />
                                    ) : (
                                        session.user?.name?.[0] || 'U'
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{session.user?.name}</span>
                                    <span className={styles.userPlan}>
                                        {(session.user as any).subscription?.plan || 'Free'} Plan
                                    </span>
                                </div>
                                <button className={styles.logoutBtn} onClick={() => signOut()} title="Logout">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <button className={styles.loginBtn} onClick={() => signIn()}>
                                <LogIn size={18} />
                                <span>Sign In</span>
                            </button>
                        )}
                    </div>
                </header>

                <section className={styles.content}>
                    {children}
                </section>
            </main>
        </div>
    );
}
