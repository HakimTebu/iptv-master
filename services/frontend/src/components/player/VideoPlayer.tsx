'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, X, Settings, RefreshCw, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Channel } from '@/context/AppContext';
import { getDeviceFingerprint, getDeviceName } from '@/lib/fingerprint';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
    channel: Channel;
    onClose: () => void;
}

export default function VideoPlayer({ channel, onClose }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
    const networkRetries = useRef(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let hls: Hls | null = null;
        networkRetries.current = 0;
        setIsLoading(true);
        setError(null);

        const startPlayback = async () => {
            try {
                const fingerprint = await getDeviceFingerprint();
                const deviceName = getDeviceName();

                // Phase 2/3: Request a secure playback token with device binding
                const tokenRes = await fetch('/api/playback/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: channel.url,
                        fingerprint,
                        deviceName
                    }),
                });

                if (tokenRes.status === 401) {
                    setError('Authentication Required. Please sign in to watch this channel.');
                    setIsLoading(false);
                    return;
                }

                if (!tokenRes.ok) {
                    throw new Error('Failed to acquire playback token');
                }

                const { token } = await tokenRes.json();

                // Timeout: if stream hasn't started after 15s, show error
                const loadingTimeout = setTimeout(() => {
                    if (isLoading && !error) {
                        setError('Stream took too long to respond. It may be offline or geo-restricted.');
                        setIsLoading(false);
                        hls?.destroy();
                    }
                }, 15000);

                if (Hls.isSupported()) {
                    hls = new Hls({
                        enableWorker: true,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                        maxBufferSize: 60 * 1024 * 1024,
                        manifestLoadingMaxRetry: 3,
                        manifestLoadingRetryDelay: 1000,
                        levelLoadingMaxRetry: 3,
                        levelLoadingRetryDelay: 1000,
                        fragLoadingMaxRetry: 3,
                        fragLoadingRetryDelay: 1000,
                        liveSyncDurationCount: 3,
                        liveMaxLatencyDurationCount: 10,
                        startLevel: -1,
                        abrEwmaDefaultEstimate: 500000,
                    });

                    // Append the secure token to the proxy request
                    const streamUrl = `/api/proxy?url=${encodeURIComponent(channel.url)}&token=${encodeURIComponent(token)}`;

                    hls.loadSource(streamUrl);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        clearTimeout(loadingTimeout);
                        video.play().catch(() => setIsPlaying(false));
                        setIsLoading(false);
                    });

                    hls.on(Hls.Events.ERROR, (_, data) => {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    networkRetries.current++;
                                    if (networkRetries.current <= 3) {
                                        console.log(`Network error, retry ${networkRetries.current}/3...`);
                                        hls?.startLoad();
                                    } else {
                                        clearTimeout(loadingTimeout);
                                        setError('Stream is unreachable. It may be offline or geo-restricted.');
                                        setIsLoading(false);
                                        hls?.destroy();
                                    }
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('Media error, attempting recovery...');
                                    hls?.recoverMediaError();
                                    break;
                                default:
                                    clearTimeout(loadingTimeout);
                                    console.error('Fatal HLS error:', data);
                                    setError(`Failed to load stream: ${data.details}`);
                                    setIsLoading(false);
                                    hls?.destroy();
                                    break;
                            }
                        }
                    });
                }
            } catch (err: any) {
                console.error('Playback Error:', err);
                setError(err.message || 'An unexpected error occurred during playback initialization.');
                setIsLoading(false);
            }
        };

        startPlayback();

        return () => {
            if (hls) hls.destroy();
        };
    }, [channel]);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) video.pause(); else video.play();
        setIsPlaying(!isPlaying);
    };

    const toggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (video.requestFullscreen) video.requestFullscreen();
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };

    // Telemetry & Watch-time tracking
    useEffect(() => {
        if (!isPlaying || isLoading || error) return;

        // Send Initial Play Event
        const sendPlayEvent = async () => {
            await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'play', url: channel.url, name: channel.name }),
            }).catch(console.error);
        };
        sendPlayEvent();

        // Heartbeat every 30 seconds
        const heartbeatInterval = setInterval(async () => {
            await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'heartbeat',
                    url: channel.url,
                    name: channel.name,
                    duration: 30
                }),
            }).catch(console.error);
        }, 30000);

        return () => clearInterval(heartbeatInterval);
    }, [isPlaying, isLoading, error, channel]);

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseMove={handleMouseMove}
            onClick={onClose}
        >
            <div className={`${styles.playerContainer} glass`} onClick={e => e.stopPropagation()}>
                {isLoading && !error && (
                    <div className={styles.loader}>
                        <RefreshCw className={styles.spinner} size={48} />
                        <p>Buffering Stream...</p>
                    </div>
                )}

                {error && (
                    <div className={styles.loader}>
                        <ShieldAlert className={styles.errorIcon} size={48} />
                        <p className={styles.errorText}>Channel Temporarily Offline</p>
                        <p className={styles.errorSubtext}>{error}</p>
                    </div>
                )}

                <video
                    ref={videoRef}
                    className={styles.video}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={() => togglePlay()}
                />

                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            className={styles.controls}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <div className={styles.controlsTop}>
                                <div className={styles.channelInfo}>
                                    {channel.logo && <img src={channel.logo} alt="" className={styles.miniLogo} />}
                                    <div>
                                        <h3 className={styles.title}>{channel.name}</h3>
                                        <p className={styles.subtitle}>{channel.group} • {channel.category}</p>
                                    </div>
                                </div>
                                <button className={styles.closeButton} onClick={onClose}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className={styles.controlsBottom}>
                                <div className={styles.leftControls}>
                                    <button onClick={togglePlay} className={styles.playButton}>
                                        {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
                                    </button>
                                    <div className={styles.volumeWrap}>
                                        <button onClick={() => setIsMuted(!isMuted)} className={styles.iconBtn}>
                                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            className={styles.volumeSlider}
                                            value={isMuted ? 0 : volume}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setVolume(val);
                                                if (videoRef.current) videoRef.current.volume = val;
                                                setIsMuted(val === 0);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className={styles.rightControls}>
                                    <button className={styles.iconBtn}><Settings size={20} /></button>
                                    <button className={styles.iconBtn} onClick={toggleFullscreen}><Maximize size={20} /></button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
