"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const SoundContext = createContext(null);

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
};

export const SoundProvider = ({ children }) => {
const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [volume, setVolume] = useState(0.01);
  const backgroundAudioRef = useRef(null);
  const clickSoundRef = useRef(null);
  const hoverSoundRef = useRef(null);
  const popupSoundRef = useRef(null);
  const tunnelSoundRef = useRef(null);
  const wasPlayingBeforeHidden = useRef(false);

  // Initialize audio elements
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      // Background audio
      if (!backgroundAudioRef.current) {
        const bgAudio = new Audio("/sounds/ledger/bg.mp3");
        bgAudio.loop = true;
        bgAudio.preload = "auto";
        backgroundAudioRef.current = bgAudio;
      }

      // Sound effects
      clickSoundRef.current = new Audio("/sounds/ledger/click.mp3");
      clickSoundRef.current.volume = .02;
      clickSoundRef.current.preload = "auto";

      hoverSoundRef.current = new Audio("/sounds/ledger/hover.mp3");
      hoverSoundRef.current.volume = 0.01;
      hoverSoundRef.current.preload = "auto";

      popupSoundRef.current = new Audio("/sounds/popup.wav");
      popupSoundRef.current.volume = 0.04;
      popupSoundRef.current.preload = "auto";

      tunnelSoundRef.current = new Audio("/sounds/ledger/Portal.mp3");
      tunnelSoundRef.current.volume = 0.04;
      tunnelSoundRef.current.preload = "auto";

      // Handle audio loading errorsx
      const handleError = (audioName) => (e) => {
        console.warn(`Failed to load ${audioName}:`, e);
      };

      backgroundAudioRef.current.addEventListener("error", handleError("background audio"));
      clickSoundRef.current.addEventListener("error", handleError("click sound"));
      hoverSoundRef.current.addEventListener("error", handleError("hover sound"));
      popupSoundRef.current.addEventListener("error", handleError("popup sound"));
      tunnelSoundRef.current.addEventListener("error", handleError("tunnel sound"));
    }

    return () => {
      // Cleanup
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
  }, []);

  // Update background audio volume
  useEffect(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle visibility change (pause/resume when tab is hidden/shown)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!backgroundAudioRef.current) return;

      if (document.hidden) {
        if (!backgroundAudioRef.current.paused) {
          wasPlayingBeforeHidden.current = true;
          backgroundAudioRef.current.pause();
          setIsAudioPlaying(false);
        }
      } else {
        if (wasPlayingBeforeHidden.current && isAudioEnabled) {
          backgroundAudioRef.current
            .play()
            .then(() => {
              setIsAudioPlaying(true);
              wasPlayingBeforeHidden.current = false;
            })
            .catch((err) => {
              console.warn("Audio resume failed:", err);
              wasPlayingBeforeHidden.current = false;
            });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAudioEnabled]);

  // Sync playing state with audio element
  useEffect(() => {
    if (!backgroundAudioRef.current) return;

    const updatePlayingState = () => {
      setIsAudioPlaying(!backgroundAudioRef.current.paused && isAudioEnabled);
    };

    backgroundAudioRef.current.addEventListener("play", updatePlayingState);
    backgroundAudioRef.current.addEventListener("pause", updatePlayingState);
    backgroundAudioRef.current.addEventListener("ended", updatePlayingState);

    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.removeEventListener("play", updatePlayingState);
        backgroundAudioRef.current.removeEventListener("pause", updatePlayingState);
        backgroundAudioRef.current.removeEventListener("ended", updatePlayingState);
      }
    };
  }, [isAudioEnabled]);

  // Toggle master audio (controls ALL sounds - background + effects)
  const toggleBackgroundAudio = useCallback(async () => {
    const newEnabledState = !isAudioEnabled;
    setIsAudioEnabled(newEnabledState);

    if (!backgroundAudioRef.current) return;

    try {
      if (newEnabledState) {
        // Enable audio - start background music
        backgroundAudioRef.current.currentTime = 0;
        await backgroundAudioRef.current.play();
        setIsAudioPlaying(true);
      } else {
        // Disable audio - stop background music
        backgroundAudioRef.current.pause();
        console.log("Disabled audio");
        setIsAudioPlaying(false);
      }
    } catch (error) {
      console.warn("Failed to toggle audio:", error);
    }
  }, [isAudioEnabled]);

  // Play background audio (only if audio is enabled)
  const playBackgroundAudio = useCallback(async () => {
    if (!backgroundAudioRef.current || !isAudioEnabled) return;

    try {
      if (backgroundAudioRef.current.paused) {
        backgroundAudioRef.current.currentTime = 0;
        await backgroundAudioRef.current.play();
        setIsAudioPlaying(true);
      }
    } catch (error) {
      console.warn("Failed to play background audio:", error);
    }
  }, [isAudioEnabled]);

  // Pause background audio
  const pauseBackgroundAudio = useCallback(() => {
    if (!backgroundAudioRef.current) return;
    backgroundAudioRef.current.pause();
    setIsAudioPlaying(false);
  }, []);

  // Play click sound
  const playClickSound = useCallback(() => {
    if (!clickSoundRef.current || !isAudioEnabled) return;

    try {
      clickSoundRef.current.currentTime = 0;
      const playPromise = clickSoundRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Click sound playback failed:", error);
        });
      }
    } catch (error) {
      console.warn("Error playing click sound:", error);
    }
  }, [isAudioEnabled]);

  // Play hover sound
  const playHoverSound = useCallback(() => {
    if (!hoverSoundRef.current || !isAudioEnabled) return;

    try {
      hoverSoundRef.current.currentTime = 0;
      const playPromise = hoverSoundRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Hover sound playback failed:", error);
        });
      }
    } catch (error) {
      console.warn("Error playing hover sound:", error);
    }
  }, [isAudioEnabled]);

  // Play popup sound
  const playPopupSound = useCallback(() => {
    if (!popupSoundRef.current || !isAudioEnabled) return;

    try {
      popupSoundRef.current.currentTime = 0;
      const playPromise = popupSoundRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Popup sound playback failed:", error);
        });
      }
    } catch (error) {
      console.warn("Error playing popup sound:", error);
    }
  }, [isAudioEnabled]);

  // Play tunnel sound
  const playTunnelSound = useCallback(() => {
    if (!tunnelSoundRef.current || !isAudioEnabled) return;

    try {
      tunnelSoundRef.current.currentTime = 0;
      const playPromise = tunnelSoundRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Tunnel sound playback failed:", error);
        });
      }
    } catch (error) {
      console.warn("Error playing tunnel sound:", error);
    }
  }, [isAudioEnabled]);

  // Enable/disable audio globally
  const setAudioEnabled = useCallback((enabled) => {
    setIsAudioEnabled(enabled);
    if (!enabled && backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, []);

  const value = {
    // State
    isAudioEnabled,
    isAudioPlaying,
    volume,
    
    // Background audio
    toggleBackgroundAudio,
    playBackgroundAudio,
    pauseBackgroundAudio,
    
    // Sound effects
    playClickSound,
    playHoverSound,
    playPopupSound,
    playTunnelSound,
    
    // Settings
    setAudioEnabled,
    setVolume,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};

