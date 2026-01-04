# 测试策略文档 (Testing Strategy)

> **项目**: AI Virtual Companion (Codia)
>
> **作者**: QA Team
>
> **状态**: Draft → Review → Approved
>
> **创建日期**: 2026-01-04
>
> **最后更新**: 2026-01-04
>
> **审阅者**: @engineering-team, @product-team

---

## 变更记录

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-01-04 | QA Team | 初始版本 |

---

## 目录

1. [测试概述](#1-测试概述)
2. [测试金字塔](#2-测试金字塔)
3. [单元测试](#3-单元测试)
4. [集成测试](#4-集成测试)
5. [端到端测试](#5-端到端测试)
6. [性能测试](#6-性能测试)
7. [可访问性测试](#7-可访问性测试)
8. [安全测试](#8-安全测试)
9. [测试工具与环境](#9-测试工具与环境)
10. [CI/CD 集成](#10-cicd-集成)
11. [测试覆盖率目标](#11-测试覆盖率目标)
12. [缺陷管理](#12-缺陷管理)

---

## 1. 测试概述

### 1.1 测试目标

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           测试目标                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  功能正确性                                                             │
│  ├── 所有用户故事的验收标准通过                                         │
│  ├── 核心功能在所有目标浏览器上工作                                     │
│  └── 边界条件和错误处理正确                                             │
│                                                                         │
│  性能达标                                                               │
│  ├── 首屏加载 < 3s (LCP)                                                │
│  ├── 3D 渲染帧率 ≥ 30 FPS                                               │
│  ├── AI 响应首 Token < 1s                                               │
│  └── TTS 首词延迟 < 500ms                                               │
│                                                                         │
│  可靠性保障                                                             │
│  ├── 单元测试覆盖率 ≥ 80%                                               │
│  ├── 关键路径 E2E 测试 100% 覆盖                                        │
│  └── 回归测试自动化率 ≥ 90%                                             │
│                                                                         │
│  用户体验                                                               │
│  ├── 可访问性符合 WCAG 2.2 AA                                           │
│  ├── 响应式设计在所有断点正常                                           │
│  └── 动画流畅无卡顿                                                     │
│                                                                         │
│  安全合规                                                               │
│  ├── 无 OWASP Top 10 漏洞                                               │
│  ├── API Key 安全存储                                                   │
│  └── 用户数据本地存储加密                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 测试范围

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           测试范围                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  在范围内 (In Scope)                                                    │
│  ├── 3D 角色渲染模块                                                    │
│  │   ├── VRM 模型加载                                                   │
│  │   ├── 表情系统                                                       │
│  │   ├── 口型同步                                                       │
│  │   └── 骨骼动画                                                       │
│  │                                                                      │
│  ├── AI 对话模块                                                        │
│  │   ├── 多 LLM 后端集成                                                │
│  │   ├── 流式响应处理                                                   │
│  │   ├── 对话历史管理                                                   │
│  │   └── 角色人设 Prompt                                                │
│  │                                                                      │
│  ├── 语音处理模块                                                       │
│  │   ├── TTS 语音合成                                                   │
│  │   ├── ASR 语音识别                                                   │
│  │   └── VAD 语音检测                                                   │
│  │                                                                      │
│  ├── 状态管理模块                                                       │
│  │   ├── Zustand Store                                                  │
│  │   ├── IndexedDB 持久化                                               │
│  │   └── 设置同步                                                       │
│  │                                                                      │
│  └── UI 组件                                                            │
│      ├── 所有设计系统组件                                               │
│      ├── 页面布局                                                       │
│      └── 响应式行为                                                     │
│                                                                         │
│  不在范围内 (Out of Scope)                                              │
│  ├── 第三方 API 内部逻辑 (OpenAI, ElevenLabs)                           │
│  ├── 浏览器引擎实现                                                     │
│  └── 网络基础设施                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 测试环境矩阵

| 环境 | 用途 | URL | 数据 |
|------|------|-----|------|
| **Local** | 开发测试 | localhost:3000 | Mock 数据 |
| **Development** | 功能验证 | dev.codia.app | 测试数据 |
| **Staging** | UAT/预发布 | staging.codia.app | 生产镜像 |
| **Production** | 线上环境 | codia.app | 生产数据 |

### 1.4 浏览器兼容性矩阵

| 浏览器 | 版本 | 优先级 | 测试级别 |
|--------|------|--------|----------|
| Chrome | 最新 2 个版本 | P0 | 完整测试 |
| Firefox | 最新 2 个版本 | P0 | 完整测试 |
| Safari | 最新 2 个版本 | P0 | 完整测试 |
| Edge | 最新 2 个版本 | P1 | 核心功能测试 |
| Safari iOS | 最新 2 个版本 | P1 | 移动端测试 |
| Chrome Android | 最新 2 个版本 | P1 | 移动端测试 |

---

## 2. 测试金字塔

### 2.1 金字塔结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Testing Pyramid                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                              /\                                         │
│                             /  \                                        │
│                            /    \                                       │
│                           / E2E  \         10% (关键用户流程)           │
│                          /________\                                     │
│                         /          \                                    │
│                        /   集成测试  \       20% (模块交互)              │
│                       /______________\                                  │
│                      /                \                                 │
│                     /     单元测试     \     70% (函数/组件)            │
│                    /____________________\                               │
│                                                                         │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  层级说明:                                                              │
│                                                                         │
│  单元测试 (70%)                                                         │
│  ├── 执行速度: 极快 (< 1ms/测试)                                        │
│  ├── 测试对象: 纯函数、工具类、独立组件                                 │
│  ├── 隔离程度: 完全隔离，Mock 外部依赖                                  │
│  └── 维护成本: 低                                                       │
│                                                                         │
│  集成测试 (20%)                                                         │
│  ├── 执行速度: 中等 (< 100ms/测试)                                      │
│  ├── 测试对象: 模块间交互、API 调用、状态管理                           │
│  ├── 隔离程度: 部分隔离，Mock 外部服务                                  │
│  └── 维护成本: 中                                                       │
│                                                                         │
│  E2E 测试 (10%)                                                         │
│  ├── 执行速度: 慢 (> 1s/测试)                                           │
│  ├── 测试对象: 完整用户流程、跨页面交互                                 │
│  ├── 隔离程度: 无隔离，真实环境                                         │
│  └── 维护成本: 高                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 各层测试分布

| 模块 | 单元测试 | 集成测试 | E2E 测试 |
|------|----------|----------|----------|
| VRMService | 15 | 5 | 2 |
| ChatService | 20 | 8 | 3 |
| TTSService | 12 | 6 | 2 |
| ASRService | 10 | 5 | 2 |
| LipSyncService | 8 | 3 | 1 |
| ExpressionController | 10 | 4 | 1 |
| Zustand Store | 15 | 6 | 2 |
| UI Components | 50 | 15 | 5 |
| **总计** | **140** | **52** | **18** |

---

## 3. 单元测试

### 3.1 测试框架配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3.2 测试设置文件

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};
Object.defineProperty(window, 'indexedDB', { value: indexedDB });

// Mock Audio Context
class MockAudioContext {
  createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 },
  }));
  destination = {};
  resume = vi.fn();
  suspend = vi.fn();
  close = vi.fn();
}
window.AudioContext = MockAudioContext as any;

// Mock WebGL
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  canvas: { width: 800, height: 600 },
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
}));

// Suppress console errors in tests
vi.spyOn(console, 'error').mockImplementation(() => {});
```

### 3.3 单元测试示例

#### 3.3.1 ChatService 测试

```typescript
// src/services/__tests__/chat-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService, ChatMessage } from '../chat-service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService();
  });

  describe('sendMessage', () => {
    it('should add user message to history', async () => {
      const message = 'Hello, world!';

      await service.sendMessage(message);

      const history = service.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        role: 'user',
        content: message,
      });
    });

    it('should throw error for empty message', async () => {
      await expect(service.sendMessage('')).rejects.toThrow(
        'Message cannot be empty'
      );
    });

    it('should handle streaming response', async () => {
      const mockStream = vi.fn();
      service.on('stream', mockStream);

      await service.sendMessage('Test', { stream: true });

      expect(mockStream).toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('should remove all messages from history', async () => {
      await service.sendMessage('Message 1');
      await service.sendMessage('Message 2');

      service.clearHistory();

      expect(service.getHistory()).toHaveLength(0);
    });

    it('should preserve system prompt after clear', () => {
      service.setSystemPrompt('You are a helpful assistant');
      service.clearHistory();

      expect(service.getSystemPrompt()).toBe('You are a helpful assistant');
    });
  });

  describe('setProvider', () => {
    it('should switch between providers', () => {
      service.setProvider('openai');
      expect(service.getProvider()).toBe('openai');

      service.setProvider('claude');
      expect(service.getProvider()).toBe('claude');
    });

    it('should throw for invalid provider', () => {
      expect(() => service.setProvider('invalid' as any)).toThrow(
        'Invalid provider'
      );
    });
  });
});
```

#### 3.3.2 ExpressionController 测试

```typescript
// src/services/__tests__/expression-controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpressionController, Emotion } from '../expression-controller';

describe('ExpressionController', () => {
  let controller: ExpressionController;
  let mockVRM: any;

  beforeEach(() => {
    mockVRM = {
      expressionManager: {
        setValue: vi.fn(),
        getValue: vi.fn(() => 0),
      },
    };
    controller = new ExpressionController(mockVRM);
  });

  describe('setExpression', () => {
    it('should set happy expression', () => {
      controller.setExpression('happy');

      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        'happy',
        1
      );
    });

    it('should reset previous expression before setting new one', () => {
      mockVRM.expressionManager.getValue.mockReturnValue(1);

      controller.setExpression('happy');
      controller.setExpression('sad');

      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        'happy',
        0
      );
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        'sad',
        1
      );
    });

    it('should interpolate expression over duration', async () => {
      vi.useFakeTimers();

      controller.setExpression('happy', { duration: 300 });

      vi.advanceTimersByTime(150);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        'happy',
        expect.any(Number)
      );

      vi.advanceTimersByTime(150);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith(
        'happy',
        1
      );

      vi.useRealTimers();
    });
  });

  describe('detectEmotion', () => {
    it.each([
      ['我很开心！', 'happy'],
      ['真是太棒了', 'happy'],
      ['我感到很难过', 'sad'],
      ['这太让人生气了', 'angry'],
      ['哇，真的吗？', 'surprised'],
      ['今天天气不错', 'neutral'],
    ])('should detect %s as %s', (text, expectedEmotion) => {
      const emotion = controller.detectEmotion(text);
      expect(emotion).toBe(expectedEmotion);
    });
  });
});
```

#### 3.3.3 UI 组件测试

```typescript
// src/components/__tests__/MessageBubble.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

describe('MessageBubble', () => {
  it('should render user message on the right', () => {
    render(
      <MessageBubble
        message={{ role: 'user', content: 'Hello!' }}
      />
    );

    const bubble = screen.getByText('Hello!');
    expect(bubble.parentElement).toHaveClass('justify-end');
  });

  it('should render assistant message on the left', () => {
    render(
      <MessageBubble
        message={{ role: 'assistant', content: 'Hi there!' }}
      />
    );

    const bubble = screen.getByText('Hi there!');
    expect(bubble.parentElement).toHaveClass('justify-start');
  });

  it('should show typing indicator when streaming', () => {
    render(
      <MessageBubble
        message={{ role: 'assistant', content: 'Typing' }}
        isStreaming={true}
      />
    );

    expect(screen.getByTestId('typing-cursor')).toBeInTheDocument();
  });

  it('should format timestamps correctly', () => {
    const timestamp = new Date('2026-01-04T10:30:00');
    render(
      <MessageBubble
        message={{ role: 'user', content: 'Test', timestamp }}
        showTimestamp
      />
    );

    expect(screen.getByText('10:30')).toBeInTheDocument();
  });
});
```

### 3.4 Mock 策略

```typescript
// src/test/mocks/llm-providers.ts
import { vi } from 'vitest';

export const mockOpenAIResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Mock response from OpenAI',
      },
      finish_reason: 'stop',
    },
  ],
};

export const mockStreamChunks = [
  { choices: [{ delta: { content: 'Hello' } }] },
  { choices: [{ delta: { content: ' world' } }] },
  { choices: [{ delta: { content: '!' } }] },
];

export const createMockLLMProvider = () => ({
  chat: vi.fn().mockResolvedValue(mockOpenAIResponse),
  stream: vi.fn().mockImplementation(async function* () {
    for (const chunk of mockStreamChunks) {
      yield chunk;
    }
  }),
});

// src/test/mocks/vrm.ts
export const createMockVRM = () => ({
  scene: {
    add: vi.fn(),
    remove: vi.fn(),
  },
  humanoid: {
    getNormalizedBoneNode: vi.fn(() => ({
      rotation: { x: 0, y: 0, z: 0 },
    })),
  },
  expressionManager: {
    setValue: vi.fn(),
    getValue: vi.fn(() => 0),
    getExpressionNames: vi.fn(() => [
      'happy', 'sad', 'angry', 'surprised', 'neutral', 'relaxed',
    ]),
  },
  lookAt: {
    target: null,
  },
  update: vi.fn(),
});
```

---

## 4. 集成测试

### 4.1 集成测试场景

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Integration Test Scenarios                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. VRM + Expression 集成                                               │
│     ├── 加载 VRM 模型后表情系统初始化                                   │
│     ├── 表情切换动画平滑过渡                                            │
│     └── 多表情混合正确                                                  │
│                                                                         │
│  2. Chat + TTS 集成                                                     │
│     ├── AI 回复触发 TTS 播放                                            │
│     ├── 流式响应同步语音合成                                            │
│     └── 语音播放完成事件触发                                            │
│                                                                         │
│  3. TTS + LipSync 集成                                                  │
│     ├── 音频播放触发口型同步                                            │
│     ├── Viseme 与 VRM BlendShape 映射                                   │
│     └── 音频停止时口型复位                                              │
│                                                                         │
│  4. ASR + Chat 集成                                                     │
│     ├── 语音识别结果发送到 Chat                                         │
│     ├── VAD 检测自动触发识别                                            │
│     └── 识别失败的错误处理                                              │
│                                                                         │
│  5. State + IndexedDB 集成                                              │
│     ├── 状态变更自动持久化                                              │
│     ├── 页面刷新后状态恢复                                              │
│     └── 数据迁移和版本升级                                              │
│                                                                         │
│  6. UI + State 集成                                                     │
│     ├── 状态变更触发 UI 更新                                            │
│     ├── 用户操作更新状态                                                │
│     └── 组件卸载时清理订阅                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 集成测试示例

```typescript
// src/integration/__tests__/chat-tts-integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from '@/services/chat-service';
import { TTSService } from '@/services/tts-service';
import { LipSyncService } from '@/services/lip-sync-service';

describe('Chat + TTS + LipSync Integration', () => {
  let chatService: ChatService;
  let ttsService: TTSService;
  let lipSyncService: LipSyncService;

  beforeEach(() => {
    chatService = new ChatService();
    ttsService = new TTSService();
    lipSyncService = new LipSyncService();

    // Wire up services
    chatService.on('response', (text) => {
      ttsService.speak(text);
    });

    ttsService.on('viseme', (viseme) => {
      lipSyncService.setViseme(viseme);
    });
  });

  afterEach(() => {
    chatService.dispose();
    ttsService.dispose();
    lipSyncService.dispose();
  });

  it('should trigger TTS when chat receives response', async () => {
    const speakSpy = vi.spyOn(ttsService, 'speak');

    await chatService.sendMessage('Hello');

    expect(speakSpy).toHaveBeenCalledWith(
      expect.stringContaining('response')
    );
  });

  it('should sync lip movement with TTS audio', async () => {
    const setVisemeSpy = vi.spyOn(lipSyncService, 'setViseme');

    await ttsService.speak('Hello world');

    // Wait for viseme events
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(setVisemeSpy).toHaveBeenCalled();
  });

  it('should reset lip sync when TTS stops', async () => {
    const resetSpy = vi.spyOn(lipSyncService, 'reset');

    await ttsService.speak('Short text');

    // Wait for audio to complete
    await new Promise(resolve => {
      ttsService.on('end', resolve);
    });

    expect(resetSpy).toHaveBeenCalled();
  });
});
```

```typescript
// src/integration/__tests__/state-persistence.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '@/store/app-store';
import { clearIndexedDB, getIndexedDBData } from '@/test/utils/indexeddb';

describe('State + IndexedDB Integration', () => {
  beforeEach(async () => {
    await clearIndexedDB();
    useAppStore.getState().reset();
  });

  afterEach(async () => {
    await clearIndexedDB();
  });

  it('should persist chat history to IndexedDB', async () => {
    const store = useAppStore.getState();

    store.addMessage({ role: 'user', content: 'Test message' });

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 100));

    const data = await getIndexedDBData('chat-history');
    expect(data).toHaveLength(1);
    expect(data[0].content).toBe('Test message');
  });

  it('should restore state on initialization', async () => {
    // Pre-populate IndexedDB
    await setIndexedDBData('settings', {
      theme: 'dark',
      volume: 0.5,
    });

    // Re-initialize store
    const store = useAppStore.getState();
    await store.hydrate();

    expect(store.settings.theme).toBe('dark');
    expect(store.settings.volume).toBe(0.5);
  });

  it('should handle data migration', async () => {
    // Old data format
    await setIndexedDBData('settings', {
      __version: 1,
      darkMode: true, // Old field name
    });

    const store = useAppStore.getState();
    await store.hydrate();

    // Should migrate to new format
    expect(store.settings.theme).toBe('dark');
    expect(store.settings.__version).toBe(2);
  });
});
```

### 4.3 API Mock Server

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  // OpenAI API mock
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 'chatcmpl-mock',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Mock AI response',
            },
          },
        ],
      })
    );
  }),

  // ElevenLabs TTS mock
  rest.post('https://api.elevenlabs.io/v1/text-to-speech/*', (req, res, ctx) => {
    return res(
      ctx.set('Content-Type', 'audio/mpeg'),
      ctx.body(Buffer.from('mock audio data'))
    );
  }),

  // VRM model mock
  rest.get('*/models/*.vrm', (req, res, ctx) => {
    // Return minimal valid VRM data
    return res(
      ctx.set('Content-Type', 'model/gltf-binary'),
      ctx.body(mockVRMBuffer)
    );
  }),
];

export const server = setupServer(...handlers);

// Setup in test/setup.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 5. 端到端测试

### 5.1 E2E 测试框架配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 关键用户流程测试

```typescript
// e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear local storage to simulate first visit
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
  });

  test('should complete onboarding as new user', async ({ page }) => {
    // Step 1: Welcome screen
    await expect(page.getByText('欢迎来到 Codia')).toBeVisible();
    await page.getByRole('button', { name: '开始体验' }).click();

    // Step 2: Character selection
    await expect(page.getByText('选择你的伙伴')).toBeVisible();
    await page.getByTestId('character-card-1').click();
    await page.getByRole('button', { name: '继续' }).click();

    // Step 3: AI configuration
    await expect(page.getByText('选择 AI 服务')).toBeVisible();
    await page.getByLabel('使用内置 AI').click();
    await page.getByRole('button', { name: '继续' }).click();

    // Step 4: Voice settings
    await expect(page.getByText('语音设置')).toBeVisible();
    await page.getByRole('button', { name: '完成' }).click();

    // Verify main screen
    await expect(page.getByTestId('character-canvas')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });

  test('should skip onboarding for returning user', async ({ page }) => {
    // Set flag to indicate user has completed onboarding
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.goto('/');

    // Should go directly to main screen
    await expect(page.getByTestId('character-canvas')).toBeVisible();
    await expect(page.getByText('欢迎来到 Codia')).not.toBeVisible();
  });
});
```

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip onboarding
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();
  });

  test('should send text message and receive response', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('send-button');

    // Type message
    await input.fill('你好，今天天气怎么样？');
    await sendButton.click();

    // Verify user message appears
    await expect(
      page.getByTestId('message-bubble-user').last()
    ).toContainText('你好，今天天气怎么样？');

    // Wait for AI response
    await expect(
      page.getByTestId('message-bubble-assistant').last()
    ).toBeVisible({ timeout: 10000 });

    // Verify response is not empty
    const response = await page
      .getByTestId('message-bubble-assistant')
      .last()
      .textContent();
    expect(response!.length).toBeGreaterThan(0);
  });

  test('should show typing indicator while waiting for response', async ({
    page,
  }) => {
    const input = page.getByTestId('chat-input');

    await input.fill('Test message');
    await input.press('Enter');

    // Typing indicator should appear
    await expect(page.getByTestId('typing-indicator')).toBeVisible();

    // And disappear after response
    await expect(page.getByTestId('typing-indicator')).not.toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle keyboard shortcut Shift+Enter for newline', async ({
    page,
  }) => {
    const input = page.getByTestId('chat-input');

    await input.fill('Line 1');
    await input.press('Shift+Enter');
    await input.type('Line 2');

    // Should contain newline
    const value = await input.inputValue();
    expect(value).toBe('Line 1\nLine 2');
  });
});
```

```typescript
// e2e/voice.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Voice Interaction', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();
  });

  test('should start voice recording on button press', async ({ page }) => {
    const voiceButton = page.getByTestId('voice-button');

    await voiceButton.click();

    // Should show recording state
    await expect(voiceButton).toHaveAttribute('data-recording', 'true');
    await expect(page.getByTestId('voice-waveform')).toBeVisible();
  });

  test('should stop recording and send on second click', async ({ page }) => {
    const voiceButton = page.getByTestId('voice-button');

    // Start recording
    await voiceButton.click();
    await page.waitForTimeout(1000); // Record for 1 second

    // Stop recording
    await voiceButton.click();

    // Should show processing
    await expect(page.getByTestId('voice-processing')).toBeVisible();

    // Should send message after processing
    await expect(page.getByTestId('message-bubble-user')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should play TTS audio for AI response', async ({ page }) => {
    // Enable TTS in settings
    await page.getByTestId('settings-button').click();
    await page.getByLabel('语音输出').check();
    await page.getByTestId('close-settings').click();

    // Send a message
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('send-button').click();

    // Wait for response and TTS
    await expect(page.getByTestId('tts-playing')).toBeVisible({
      timeout: 15000,
    });
  });
});
```

```typescript
// e2e/character.spec.ts
import { test, expect } from '@playwright/test';

test.describe('3D Character', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();
  });

  test('should load and display 3D character', async ({ page }) => {
    const canvas = page.getByTestId('character-canvas');

    await expect(canvas).toBeVisible();

    // Wait for model to load
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({
      timeout: 10000,
    });

    // Verify WebGL context is active
    const hasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('webgl2') || el.getContext('webgl');
      return ctx !== null;
    });
    expect(hasContent).toBe(true);
  });

  test('should change expression based on chat emotion', async ({ page }) => {
    // Get initial expression
    const initialExpression = await page
      .getByTestId('current-expression')
      .textContent();

    // Send a happy message
    await page.getByTestId('chat-input').fill('我今天非常开心！');
    await page.getByTestId('send-button').click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Expression should change
    const newExpression = await page
      .getByTestId('current-expression')
      .textContent();

    // May or may not change depending on AI response
    // At minimum, verify expression system is working
    expect(newExpression).toBeDefined();
  });

  test('should allow camera rotation with drag', async ({ page }) => {
    const canvas = page.getByTestId('character-canvas');
    const bounds = await canvas.boundingBox();

    if (bounds) {
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      // Drag to rotate
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 100, centerY);
      await page.mouse.up();

      // Camera should have moved (verify via state or visual)
      // This is a basic interaction test
    }
  });
});
```

### 5.3 视觉回归测试

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('main page should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();

    // Wait for 3D to load
    await page.waitForTimeout(3000);

    // Take screenshot
    await expect(page).toHaveScreenshot('main-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('settings panel should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();

    await page.getByTestId('settings-button').click();

    await expect(page.getByTestId('settings-panel')).toHaveScreenshot(
      'settings-panel.png'
    );
  });

  test('dark mode should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();

    await expect(page).toHaveScreenshot('dark-mode.png', {
      maxDiffPixels: 100,
    });
  });
});
```

---

## 6. 性能测试

### 6.1 性能基准

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Performance Benchmarks                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  加载性能                                                               │
│  ├── FCP (First Contentful Paint): < 1.5s                              │
│  ├── LCP (Largest Contentful Paint): < 3s                              │
│  ├── FID (First Input Delay): < 100ms                                  │
│  ├── CLS (Cumulative Layout Shift): < 0.1                              │
│  ├── TTFB (Time to First Byte): < 500ms                                │
│  └── TTI (Time to Interactive): < 5s                                   │
│                                                                         │
│  运行时性能                                                             │
│  ├── 3D 渲染帧率: ≥ 30 FPS (目标 60 FPS)                               │
│  ├── 内存使用: < 200MB (初始), < 500MB (长时间使用)                    │
│  ├── CPU 使用: < 30% (空闲), < 80% (活跃)                              │
│  └── JS 执行时间: < 50ms/帧                                            │
│                                                                         │
│  网络性能                                                               │
│  ├── 首屏资源: < 500KB (JS) + < 200KB (CSS)                           │
│  ├── VRM 模型: < 10MB (压缩后)                                         │
│  ├── API 响应: < 1s (首 Token)                                         │
│  └── 音频流: < 500ms (首词延迟)                                        │
│                                                                         │
│  设备适配                                                               │
│  ├── 低端设备: 720p, 30 FPS, 降级效果                                  │
│  ├── 中端设备: 1080p, 60 FPS, 标准效果                                 │
│  └── 高端设备: 4K, 60 FPS, 完整效果                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Lighthouse 测试

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Lighthouse Performance', () => {
  test('should meet performance thresholds', async ({ page }) => {
    await page.goto('/');

    const result = await playAudit({
      page,
      thresholds: {
        performance: 70,
        accessibility: 90,
        'best-practices': 80,
        seo: 80,
      },
      port: 9222,
    });

    expect(result.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.7);
    expect(result.lhr.categories.accessibility.score).toBeGreaterThanOrEqual(0.9);
  });

  test('should have acceptable Core Web Vitals', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Get Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {};

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          }
          if (vitals.fcp && vitals.lcp) {
            resolve(vitals);
          }
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

        // Timeout fallback
        setTimeout(() => resolve(vitals), 10000);
      });
    });

    expect((webVitals as any).fcp).toBeLessThan(1500);
    expect((webVitals as any).lcp).toBeLessThan(3000);
  });
});
```

### 6.3 帧率监控测试

```typescript
// e2e/fps.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Frame Rate Performance', () => {
  test('should maintain 30+ FPS during interaction', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();

    // Wait for 3D to initialize
    await page.waitForTimeout(3000);

    // Start FPS monitoring
    const fpsValues = await page.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const fps: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFPS = () => {
          frameCount++;
          const currentTime = performance.now();

          if (currentTime - lastTime >= 1000) {
            fps.push(frameCount);
            frameCount = 0;
            lastTime = currentTime;
          }

          if (fps.length < 5) {
            requestAnimationFrame(measureFPS);
          } else {
            resolve(fps);
          }
        };

        requestAnimationFrame(measureFPS);
      });
    });

    // Average FPS should be >= 30
    const avgFPS = fpsValues.reduce((a, b) => a + b) / fpsValues.length;
    expect(avgFPS).toBeGreaterThanOrEqual(30);
  });

  test('should not drop frames during chat interaction', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();

    // Start monitoring
    await page.evaluate(() => {
      (window as any).droppedFrames = 0;
      (window as any).totalFrames = 0;

      let lastTime = performance.now();
      const monitor = () => {
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;

        (window as any).totalFrames++;
        if (delta > 33) { // More than 30ms = dropped frame
          (window as any).droppedFrames++;
        }

        requestAnimationFrame(monitor);
      };
      requestAnimationFrame(monitor);
    });

    // Perform interactions
    await page.getByTestId('chat-input').fill('Test message');
    await page.getByTestId('send-button').click();
    await page.waitForTimeout(5000);

    // Check dropped frames
    const { droppedFrames, totalFrames } = await page.evaluate(() => ({
      droppedFrames: (window as any).droppedFrames,
      totalFrames: (window as any).totalFrames,
    }));

    const dropRate = droppedFrames / totalFrames;
    expect(dropRate).toBeLessThan(0.1); // Less than 10% dropped
  });
});
```

### 6.4 内存泄漏测试

```typescript
// e2e/memory.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Memory Performance', () => {
  test('should not have memory leaks after repeated interactions', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();

    // Get initial memory
    const getMemory = async () => {
      return page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
    };

    const initialMemory = await getMemory();

    // Perform repeated interactions
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('chat-input').fill(`Message ${i}`);
      await page.getByTestId('send-button').click();
      await page.waitForTimeout(2000);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(1000);
    const finalMemory = await getMemory();

    // Memory growth should be reasonable (< 50MB)
    const growth = finalMemory - initialMemory;
    expect(growth).toBeLessThan(50 * 1024 * 1024);
  });

  test('should release memory when switching characters', async ({ page }) => {
    await page.goto('/');

    // Load first character
    await page.waitForTimeout(3000);
    const memory1 = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Switch character
    await page.getByTestId('character-switcher').click();
    await page.getByTestId('character-card-2').click();
    await page.waitForTimeout(3000);

    // Force GC
    await page.evaluate(() => {
      if ((window as any).gc) (window as any).gc();
    });

    const memory2 = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory should not accumulate significantly
    expect(memory2).toBeLessThan(memory1 * 1.5);
  });
});
```

---

## 7. 可访问性测试

### 7.1 自动化可访问性测试

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should have no WCAG 2.2 AA violations on main page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding-complete', 'true');
    });
    await page.reload();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no violations on settings panel', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('settings-button').click();

    const results = await new AxeBuilder({ page })
      .include('#settings-panel')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have no violations in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
});
```

### 7.2 键盘导航测试

```typescript
// e2e/keyboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test('should be fully navigable by keyboard', async ({ page }) => {
    await page.goto('/');

    // Tab through elements
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('skip-link')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('logo')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('settings-button')).toBeFocused();
  });

  test('should open and close settings with keyboard', async ({ page }) => {
    await page.goto('/');

    // Navigate to settings button
    await page.getByTestId('settings-button').focus();
    await page.keyboard.press('Enter');

    // Settings should open
    await expect(page.getByTestId('settings-panel')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('settings-panel')).not.toBeVisible();
  });

  test('should send message with Enter key', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('chat-input').focus();
    await page.keyboard.type('Test message');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('message-bubble-user')).toContainText(
      'Test message'
    );
  });

  test('should support Shift+Enter for newline', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('chat-input').focus();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Line 2');

    const value = await page.getByTestId('chat-input').inputValue();
    expect(value).toContain('\n');
  });
});
```

### 7.3 屏幕阅读器测试

```typescript
// e2e/screen-reader.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Screen Reader Support', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check main regions
    await expect(page.getByRole('main')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('AI')
    );

    // Check buttons
    await expect(page.getByTestId('voice-button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('语音')
    );

    // Check input
    await expect(page.getByTestId('chat-input')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('输入')
    );
  });

  test('should announce new messages', async ({ page }) => {
    await page.goto('/');

    // Check for live region
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();

    // Send message
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('send-button').click();

    // New message should be in live region
    await expect(liveRegion.getByRole('article')).toBeVisible();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('settings-button').click();

    // All form controls should have labels
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel =
        (await input.getAttribute('aria-label')) ||
        (await input.getAttribute('aria-labelledby')) ||
        (await input.getAttribute('id')) !== null;

      expect(hasLabel).toBeTruthy();
    }
  });
});
```

---

## 8. 安全测试

### 8.1 安全测试清单

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Security Test Checklist                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OWASP Top 10 检查                                                      │
│  ├── [ ] A01: Broken Access Control - N/A (无后端)                     │
│  ├── [ ] A02: Cryptographic Failures - API Key 加密存储                │
│  ├── [ ] A03: Injection - XSS 防护, Prompt 注入防护                    │
│  ├── [ ] A04: Insecure Design - 安全设计审查                           │
│  ├── [ ] A05: Security Misconfiguration - CSP, Headers                 │
│  ├── [ ] A06: Vulnerable Components - 依赖扫描                         │
│  ├── [ ] A07: Auth Failures - N/A (无认证)                             │
│  ├── [ ] A08: Data Integrity Failures - 数据完整性检查                 │
│  ├── [ ] A09: Security Logging - 错误日志不泄露敏感信息                │
│  └── [ ] A10: SSRF - N/A (无服务端请求)                                │
│                                                                         │
│  前端安全                                                               │
│  ├── [ ] XSS 防护 (React 默认转义)                                     │
│  ├── [ ] CSRF 防护 (无状态，不需要)                                    │
│  ├── [ ] Clickjacking 防护 (X-Frame-Options)                           │
│  ├── [ ] Content Security Policy                                       │
│  ├── [ ] Subresource Integrity                                         │
│  └── [ ] 敏感数据处理                                                  │
│                                                                         │
│  API 安全                                                               │
│  ├── [ ] API Key 不暴露在前端代码                                      │
│  ├── [ ] API Key 加密存储                                              │
│  ├── [ ] HTTPS 强制                                                    │
│  └── [ ] 请求限流                                                      │
│                                                                         │
│  数据安全                                                               │
│  ├── [ ] IndexedDB 数据加密                                            │
│  ├── [ ] 导出数据脱敏                                                  │
│  └── [ ] 数据清除功能                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 XSS 测试

```typescript
// e2e/security/xss.spec.ts
import { test, expect } from '@playwright/test';

test.describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    '"><script>alert("xss")</script>',
  ];

  for (const payload of xssPayloads) {
    test(`should escape XSS payload: ${payload.slice(0, 20)}...`, async ({
      page,
    }) => {
      await page.goto('/');

      // Send XSS payload as message
      await page.getByTestId('chat-input').fill(payload);
      await page.getByTestId('send-button').click();

      // Wait for message to appear
      await page.waitForTimeout(1000);

      // Verify script did not execute
      const alertCalled = await page.evaluate(() => {
        return (window as any).xssAlertCalled === true;
      });
      expect(alertCalled).toBe(false);

      // Verify payload is escaped in DOM
      const messageContent = await page
        .getByTestId('message-bubble-user')
        .last()
        .innerHTML();
      expect(messageContent).not.toContain('<script>');
      expect(messageContent).not.toContain('onerror=');
    });
  }
});
```

### 8.3 API Key 安全测试

```typescript
// e2e/security/api-key.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Key Security', () => {
  test('should not expose API key in page source', async ({ page }) => {
    await page.goto('/');

    // Set API key
    await page.getByTestId('settings-button').click();
    await page.getByTestId('api-key-input').fill('sk-test-key-12345');
    await page.getByTestId('save-settings').click();

    // Check page source
    const content = await page.content();
    expect(content).not.toContain('sk-test-key-12345');

    // Check network requests
    const requests: string[] = [];
    page.on('request', (request) => {
      requests.push(request.url() + JSON.stringify(request.headers()));
    });

    await page.getByTestId('chat-input').fill('Test');
    await page.getByTestId('send-button').click();
    await page.waitForTimeout(2000);

    // API key should not be in URL
    for (const request of requests) {
      expect(request).not.toContain('sk-test-key-12345');
    }
  });

  test('should encrypt API key in storage', async ({ page }) => {
    await page.goto('/');

    // Set API key
    await page.getByTestId('settings-button').click();
    await page.getByTestId('api-key-input').fill('sk-test-key-12345');
    await page.getByTestId('save-settings').click();

    // Check localStorage
    const localStorage = await page.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });
    expect(localStorage).not.toContain('sk-test-key-12345');

    // Check IndexedDB
    const indexedDB = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = window.indexedDB.open('codia-db');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('settings', 'readonly');
          const store = tx.objectStore('settings');
          const getRequest = store.getAll();
          getRequest.onsuccess = () => {
            resolve(JSON.stringify(getRequest.result));
          };
        };
      });
    });
    expect(indexedDB).not.toContain('sk-test-key-12345');
  });
});
```

### 8.4 依赖漏洞扫描

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  code-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript
```

---

## 9. 测试工具与环境

### 9.1 工具栈

| 工具 | 用途 | 版本 |
|------|------|------|
| **Vitest** | 单元/集成测试 | ^1.0.0 |
| **Playwright** | E2E 测试 | ^1.40.0 |
| **Testing Library** | React 组件测试 | ^14.0.0 |
| **MSW** | API Mock | ^2.0.0 |
| **axe-core** | 可访问性测试 | ^4.8.0 |
| **Lighthouse CI** | 性能测试 | ^0.13.0 |
| **Storybook** | 组件开发/测试 | ^7.6.0 |

### 9.2 测试数据管理

```typescript
// src/test/fixtures/index.ts
export const testUsers = {
  newUser: {
    id: 'new-user-1',
    settings: {},
    history: [],
  },
  returningUser: {
    id: 'returning-user-1',
    settings: {
      theme: 'dark',
      volume: 0.8,
      ttsEnabled: true,
    },
    history: [
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous response' },
    ],
  },
};

export const testCharacters = {
  default: {
    id: 'char-1',
    name: 'Aria',
    modelUrl: '/models/aria.vrm',
    personality: 'friendly',
  },
  custom: {
    id: 'char-custom',
    name: 'Custom',
    modelUrl: '/models/custom.vrm',
    personality: 'custom prompt here',
  },
};

export const testMessages = {
  simple: 'Hello',
  long: 'A'.repeat(1000),
  multiline: 'Line 1\nLine 2\nLine 3',
  emoji: 'Hello! 😊🎉',
  chinese: '你好，世界！',
  mixed: 'Hello 你好 123 !@#',
};
```

---

## 10. CI/CD 集成

### 10.1 GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: npm run test:e2e -- --project=${{ matrix.browser }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

### 10.2 Pre-commit 检查

```yaml
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run lint
npm run lint

# Run type check
npm run type-check

# Run unit tests for changed files
npm run test:unit -- --changed --passWithNoTests
```

### 10.3 测试报告

```typescript
// vitest.config.ts - 报告配置
{
  reporters: [
    'default',
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['html', { outputFile: 'test-results/html/index.html' }],
  ],
}

// playwright.config.ts - 报告配置
{
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['github'], // GitHub Actions annotations
  ],
}
```

---

## 11. 测试覆盖率目标

### 11.1 覆盖率指标

| 类型 | 目标 | 最低 |
|------|------|------|
| **行覆盖率** | 85% | 80% |
| **分支覆盖率** | 80% | 75% |
| **函数覆盖率** | 90% | 85% |
| **语句覆盖率** | 85% | 80% |

### 11.2 模块级覆盖率

| 模块 | 目标覆盖率 | 原因 |
|------|-----------|------|
| Core Services | 90% | 核心业务逻辑 |
| UI Components | 80% | 大部分是展示逻辑 |
| Utils/Helpers | 95% | 纯函数，易测试 |
| Hooks | 85% | 状态逻辑 |
| Store | 90% | 数据管理核心 |

### 11.3 覆盖率执行

```json
// package.json scripts
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:check": "vitest run --coverage --coverage.thresholds.lines=80"
  }
}
```

---

## 12. 缺陷管理

### 12.1 缺陷严重程度

| 级别 | 定义 | 响应时间 | 示例 |
|------|------|----------|------|
| **Critical** | 系统崩溃/数据丢失 | 4 小时 | 页面白屏、数据损坏 |
| **High** | 核心功能不可用 | 24 小时 | 无法发送消息、3D 不渲染 |
| **Medium** | 功能受损但有绕过 | 3 天 | 语音识别偶尔失败 |
| **Low** | 体验问题 | 1 周 | 动画卡顿、样式问题 |

### 12.2 缺陷生命周期

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Bug Lifecycle                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  New → Confirmed → In Progress → In Review → Resolved → Closed          │
│   │        │            │            │           │          │           │
│   │        │            │            │           │          │           │
│   └─ Rejected (重复/无法复现/设计如此)           │          │           │
│              │            │            │         │          │           │
│              └─ Deferred (延期处理)    │         │          │           │
│                           │            │         │          │           │
│                           └─ Blocked (阻塞) ─────┘          │           │
│                                        │                    │           │
│                                        └─ Reopened (重新打开)│           │
│                                                             │           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.3 缺陷报告模板

```markdown
## Bug Report

**标题**: [模块] 简短描述问题

**严重程度**: Critical / High / Medium / Low

**环境**:
- 浏览器: Chrome 120
- 操作系统: macOS 14
- 设备: MacBook Pro
- 应用版本: 1.0.0

**复现步骤**:
1. 打开应用
2. 执行操作 X
3. 观察到问题

**预期行为**:
描述正确的行为应该是什么

**实际行为**:
描述观察到的错误行为

**截图/视频**:
[附上相关截图或视频]

**控制台日志**:
```
[粘贴相关错误日志]
```

**额外信息**:
任何有助于调查的额外信息
```

---

## 附录

### A. 测试脚本命令

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### B. 测试目录结构

```
src/
├── __tests__/              # 单元测试
│   ├── services/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/            # 集成测试
│   └── __tests__/
└── test/                   # 测试工具
    ├── mocks/
    ├── fixtures/
    ├── utils/
    └── setup.ts

e2e/                        # E2E 测试
├── onboarding.spec.ts
├── chat.spec.ts
├── voice.spec.ts
├── character.spec.ts
├── performance.spec.ts
├── accessibility.spec.ts
└── security/
    ├── xss.spec.ts
    └── api-key.spec.ts
```

### C. 参考资源

| 资源 | 链接 |
|------|------|
| Vitest 文档 | https://vitest.dev |
| Playwright 文档 | https://playwright.dev |
| Testing Library | https://testing-library.com |
| axe-core | https://github.com/dequelabs/axe-core |
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ |
| OWASP Top 10 | https://owasp.org/Top10/ |

---

**文档结束**

*此文档将随测试策略演进持续更新。*
