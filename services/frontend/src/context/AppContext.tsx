'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Channel {
    id: string;
    name: string;
    url: string;
    logo: string;
    epgId: string;
    group: string;
    category: string;
    isHD: boolean;
    isGeoBlocked: boolean;
    isYoutube: boolean;
}

export interface ChannelGroup {
    name: string;
    slug: string;
    channels: Channel[];
}

export type HealthStatus = 'online' | 'offline' | 'checking' | 'unknown';

interface AppContextType {
    groups: ChannelGroup[];
    selectedGroup: string | null;
    setSelectedGroup: (slug: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    favorites: string[];
    toggleFavorite: (channelId: string) => void;
    currentChannel: Channel | null;
    setCurrentChannel: (channel: Channel | null) => void;
    healthStatus: Record<string, HealthStatus>;
    isHealthChecking: boolean;
    healthCheckProgress: { checked: number; total: number };
    runHealthCheck: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [groups, setGroups] = useState<ChannelGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
    const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({});
    const [isHealthChecking, setIsHealthChecking] = useState(false);
    const [healthCheckProgress, setHealthCheckProgress] = useState({ checked: 0, total: 0 });

    useEffect(() => {
        fetch('/api/channels')
            .then(res => res.json())
            .then(data => {
                setGroups(data);
                if (data.length > 0) setSelectedGroup(data[0].slug);
            });

        const savedFavorites = localStorage.getItem('iptv-favorites');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

        // Load cached health results
        const cachedHealth = localStorage.getItem('iptv-health');
        if (cachedHealth) {
            try {
                const parsed = JSON.parse(cachedHealth);
                // Only use cache if less than 30 minutes old
                if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                    setHealthStatus(parsed.data);
                }
            } catch { }
        }
    }, []);

    const toggleFavorite = (channelId: string) => {
        const newFavorites = favorites.includes(channelId)
            ? favorites.filter(id => id !== channelId)
            : [...favorites, channelId];
        setFavorites(newFavorites);
        localStorage.setItem('iptv-favorites', JSON.stringify(newFavorites));
    };

    const runHealthCheck = useCallback(async () => {
        if (isHealthChecking || groups.length === 0) return;

        setIsHealthChecking(true);

        // Get all unique URLs from all groups
        const allChannels = groups.flatMap(g => g.channels);
        const uniqueUrls = [...new Set(allChannels.map(c => c.url))];
        const total = uniqueUrls.length;

        setHealthCheckProgress({ checked: 0, total });

        // Mark all as checking
        const checkingStatus: Record<string, HealthStatus> = {};
        allChannels.forEach(c => { checkingStatus[c.url] = 'checking'; });
        setHealthStatus(checkingStatus);

        // Process in batches of 20 to avoid overwhelming the API
        const batchSize = 20;
        const newStatus: Record<string, HealthStatus> = {};

        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
            const batch = uniqueUrls.slice(i, i + batchSize);
            try {
                const res = await fetch('/api/health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: batch }),
                });
                const results = await res.json();

                for (const [url, data] of Object.entries(results)) {
                    newStatus[url] = (data as any).status as HealthStatus;
                }

                // Update progress and status incrementally
                setHealthCheckProgress({ checked: Math.min(i + batchSize, total), total });
                setHealthStatus(prev => ({ ...prev, ...newStatus }));
            } catch (error) {
                console.error('Health check batch failed:', error);
                batch.forEach(url => { newStatus[url] = 'unknown'; });
            }
        }

        setHealthStatus(newStatus);
        setIsHealthChecking(false);

        // Cache results
        localStorage.setItem('iptv-health', JSON.stringify({
            timestamp: Date.now(),
            data: newStatus,
        }));
    }, [groups, isHealthChecking]);

    return (
        <AppContext.Provider value={{
            groups,
            selectedGroup,
            setSelectedGroup,
            searchQuery,
            setSearchQuery,
            favorites,
            toggleFavorite,
            currentChannel,
            setCurrentChannel,
            healthStatus,
            isHealthChecking,
            healthCheckProgress,
            runHealthCheck,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
