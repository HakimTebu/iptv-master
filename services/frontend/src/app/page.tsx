'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import ChannelGrid from '@/components/channels/ChannelGrid';
import VideoPlayer from '@/components/player/VideoPlayer';

export default function Home() {
  const { currentChannel, setCurrentChannel } = useAppContext();

  return (
    <>
      <ChannelGrid />

      <AnimatePresence>
        {currentChannel && (
          <VideoPlayer
            channel={currentChannel}
            onClose={() => setCurrentChannel(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
