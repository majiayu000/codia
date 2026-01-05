export interface TTSConfig {
  provider: "kokoro" | "elevenlabs" | "none";
  voiceId: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResult {
  audioBuffer: AudioBuffer;
  duration: number;
}

const DEFAULT_CONFIG: TTSConfig = {
  provider: "none",
  voiceId: "default",
  speed: 1.0,
  pitch: 1.0,
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function synthesizeSpeech(
  text: string,
  config: Partial<TTSConfig> = {}
): Promise<TTSResult | null> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  if (mergedConfig.provider === "none") {
    return null;
  }

  if (mergedConfig.provider === "kokoro") {
    return synthesizeWithKokoro(text, mergedConfig);
  }

  if (mergedConfig.provider === "elevenlabs") {
    return synthesizeWithElevenLabs(text, mergedConfig);
  }

  return null;
}

async function synthesizeWithKokoro(
  text: string,
  config: TTSConfig
): Promise<TTSResult | null> {
  try {
    const response = await fetch("/api/tts/kokoro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId: config.voiceId,
        speed: config.speed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Kokoro TTS error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const ctx = getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    return {
      audioBuffer,
      duration: audioBuffer.duration,
    };
  } catch (error) {
    console.error("Kokoro TTS error:", error);
    return null;
  }
}

async function synthesizeWithElevenLabs(
  text: string,
  config: TTSConfig
): Promise<TTSResult | null> {
  try {
    const response = await fetch("/api/tts/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId: config.voiceId,
        speed: config.speed,
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const ctx = getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    return {
      audioBuffer,
      duration: audioBuffer.duration,
    };
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return null;
  }
}

export async function playAudio(audioBuffer: AudioBuffer): Promise<void> {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  return new Promise((resolve) => {
    source.onended = () => resolve();
    source.start(0);
  });
}

export function stopAudio(): void {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

// Browser TTS fallback
export function useBrowserTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Browser TTS not supported"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(event.error));

    window.speechSynthesis.speak(utterance);
  });
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}
