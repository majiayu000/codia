export interface ASRConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface ASRResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface ASRCallbacks {
  onResult?: (result: ASRResult) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

let recognition: SpeechRecognition | null = null;
let isListening = false;

export function isASRSupported(): boolean {
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function startListening(
  callbacks: ASRCallbacks,
  config: ASRConfig = {}
): boolean {
  if (!isASRSupported()) {
    callbacks.onError?.(new Error("Speech recognition not supported"));
    return false;
  }

  if (isListening) {
    return true;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = config.language || "en-US";
  recognition.continuous = config.continuous ?? false;
  recognition.interimResults = config.interimResults ?? true;

  recognition.onstart = () => {
    isListening = true;
    callbacks.onStart?.();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (lastResult) {
      callbacks.onResult?.({
        transcript: lastResult[0].transcript,
        isFinal: lastResult.isFinal,
        confidence: lastResult[0].confidence,
      });
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    callbacks.onError?.(new Error(event.error));
  };

  recognition.onend = () => {
    isListening = false;
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
    return true;
  } catch (error) {
    callbacks.onError?.(
      error instanceof Error ? error : new Error("Failed to start recognition")
    );
    return false;
  }
}

export function stopListening(): void {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
  }
}

export function isCurrentlyListening(): boolean {
  return isListening;
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
      | null;
    onerror:
      | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
      | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
}
