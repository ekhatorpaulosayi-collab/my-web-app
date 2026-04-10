/**
 * Notification Sound Generator
 * Creates a pleasant two-tone chime sound using Web Audio API
 */

class NotificationSound {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isUserActivated: boolean = false;
  private userInteractionListenerAdded: boolean = false;

  /**
   * Initialize and generate the notification sound
   */
  async init(): Promise<void> {
    if (this.audioBuffer) return; // Already initialized

    try {
      // Create AudioContext in suspended state initially
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Add user interaction listener if not already added
      if (!this.userInteractionListenerAdded) {
        this.setupUserInteractionListener();
      }

      const sampleRate = this.audioContext.sampleRate;
      const duration = 0.5; // 500ms total
      const numSamples = Math.floor(sampleRate * duration);

      // Create buffer for our sound
      this.audioBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
      const channel = this.audioBuffer.getChannelData(0);

      // Generate a pleasant two-tone chime
      const freq1 = 523.25; // C5
      const freq2 = 659.25; // E5
      const attackTime = 0.01;
      const decayTime = 0.1;
      const sustainLevel = 0.3;
      const releaseTime = 0.2;

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let amplitude = 0;

        // ADSR envelope for first tone
        if (t < 0.25) {
          // First tone
          if (t < attackTime) {
            amplitude = t / attackTime;
          } else if (t < attackTime + decayTime) {
            const decayProgress = (t - attackTime) / decayTime;
            amplitude = 1 - decayProgress * (1 - sustainLevel);
          } else {
            amplitude = sustainLevel * Math.exp(-(t - attackTime - decayTime) * 4);
          }
          channel[i] = Math.sin(2 * Math.PI * freq1 * t) * amplitude * 0.3;
        } else {
          // Second tone (higher)
          const t2 = t - 0.25;
          if (t2 < attackTime) {
            amplitude = t2 / attackTime;
          } else if (t2 < attackTime + decayTime) {
            const decayProgress = (t2 - attackTime) / decayTime;
            amplitude = 1 - decayProgress * (1 - sustainLevel);
          } else {
            amplitude = sustainLevel * Math.exp(-(t2 - attackTime - decayTime) * 4);
          }
          channel[i] = Math.sin(2 * Math.PI * freq2 * t) * amplitude * 0.3;
        }
      }

      console.log('[NotificationSound] Sound buffer generated');
    } catch (error) {
      console.error('[NotificationSound] Failed to initialize:', error);
    }
  }

  /**
   * Setup user interaction listener to enable AudioContext
   */
  private setupUserInteractionListener(): void {
    const enableAudio = async () => {
      if (!this.audioContext) return;

      try {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          console.log('🔊 [NotificationSound] AudioContext resumed after user interaction');
        }
        this.isUserActivated = true;

        // Remove listeners after successful activation
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
        document.removeEventListener('keydown', enableAudio);

        // Dispatch custom event to notify UI
        window.dispatchEvent(new CustomEvent('audioContextEnabled'));
      } catch (error) {
        console.error('[NotificationSound] Failed to resume AudioContext:', error);
      }
    };

    // Add multiple event listeners for better coverage
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    this.userInteractionListenerAdded = true;

    console.log('🔊 [NotificationSound] Waiting for user interaction to enable audio...');
  }

  /**
   * Check if AudioContext is suspended (sound blocked)
   */
  isSoundBlocked(): boolean {
    return this.audioContext?.state === 'suspended' || !this.isUserActivated;
  }

  /**
   * Get AudioContext state
   */
  getAudioState(): 'suspended' | 'running' | 'closed' | 'not-initialized' {
    if (!this.audioContext) return 'not-initialized';
    return this.audioContext.state;
  }

  /**
   * Manually trigger audio enable (useful for button clicks)
   */
  async enableAudio(): Promise<boolean> {
    if (!this.audioContext) {
      await this.init();
    }

    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.isUserActivated = true;
        console.log('🔊 [NotificationSound] AudioContext manually enabled');
        window.dispatchEvent(new CustomEvent('audioContextEnabled'));
        return true;
      } catch (error) {
        console.error('[NotificationSound] Failed to enable audio:', error);
        return false;
      }
    }

    return this.isUserActivated;
  }

  /**
   * Play the notification sound
   * @param volume - Volume level from 0 to 1 (default: 0.5)
   */
  async play(volume: number = 0.5): Promise<void> {
    // Initialize if not already done
    if (!this.audioBuffer) {
      await this.init();
    }

    if (!this.audioContext || !this.audioBuffer) {
      console.warn('[NotificationSound] Audio not initialized');
      return;
    }

    // Log current audio state
    console.log(`🔊 [NotificationSound] Attempting to play sound. State: ${this.audioContext.state}, User activated: ${this.isUserActivated}`);

    try {
      // Resume context if suspended (Chrome autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('⚠️ [NotificationSound] AudioContext is suspended, attempting to resume...');
        await this.audioContext.resume();
        this.isUserActivated = true;
        console.log('✅ [NotificationSound] AudioContext resumed successfully');
      }

      // Create and play the sound
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.audioBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      source.start(0);
    } catch (error) {
      console.error('[NotificationSound] Failed to play sound:', error);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.audioBuffer = null;
    }
  }
}

// Create singleton instance
export const notificationSound = new NotificationSound();

// Helper function for easy usage
export async function playNotificationSound(volume: number = 0.5): Promise<void> {
  try {
    await notificationSound.play(volume);
  } catch (error) {
    console.error('[NotificationSound] Error playing sound:', error);
  }
}

// Export additional helper functions
export function isSoundBlocked(): boolean {
  return notificationSound.isSoundBlocked();
}

export function getAudioState(): 'suspended' | 'running' | 'closed' | 'not-initialized' {
  return notificationSound.getAudioState();
}

export async function enableAudio(): Promise<boolean> {
  return notificationSound.enableAudio();
}

// Initialize on module load
if (typeof window !== 'undefined') {
  notificationSound.init().catch(err => {
    console.error('[NotificationSound] Failed to auto-initialize:', err);
  });
}