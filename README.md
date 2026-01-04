# Codia - AI Virtual Companion

> Web-based 3D AI virtual companion with voice interaction, lip sync, and emotional expressions.

## Overview

Codia is a web application that brings AI companions to life through 3D avatars. Inspired by CODE27 Character Livehouse, it provides an immersive AI companion experience accessible directly from your browser.

## Key Features

- **3D VRM Character Rendering** - Load and display VRM models with expressions and animations
- **AI Conversation** - Multi-LLM support (OpenAI, Claude, Ollama)
- **Voice Interaction** - Text-to-Speech (Kokoro/ElevenLabs) and Speech Recognition (Whisper)
- **Lip Sync** - Real-time mouth animation synchronized with speech
- **Expression System** - 6 basic emotions that respond to conversation context
- **Privacy-First** - Local-first data storage with IndexedDB

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Framework | Next.js 14+, TypeScript |
| 3D Rendering | Three.js, @react-three/fiber, @pixiv/three-vrm |
| AI/LLM | OpenAI, Anthropic Claude, Ollama |
| TTS | Kokoro (browser-local), ElevenLabs |
| ASR | Whisper.js (browser WASM) |
| State | Zustand + IndexedDB |
| Styling | Tailwind CSS |

## Documentation

| Document | Description |
|----------|-------------|
| [01-Product-Discovery](docs/01-Product-Discovery.md) | Market research, user personas, competitive analysis |
| [02-PRD](docs/02-PRD-Product-Requirements.md) | Product requirements, user stories, acceptance criteria |
| [03-Technical-Specification](docs/03-Technical-Specification.md) | Architecture, module design, API specifications |
| [04-UI-UX-Design](docs/04-UI-UX-Design.md) | Design system, components, interaction flows |
| [05-Testing-Strategy](docs/05-Testing-Strategy.md) | Test pyramid, automation, CI/CD integration |
| [06-Implementation-Plan](docs/06-Implementation-Plan.md) | Sprint planning, milestones, task breakdown |

## Project Status

**Phase**: Planning & Design Complete

- [x] Product Discovery
- [x] PRD (Product Requirements Document)
- [x] Technical Specification
- [x] UI/UX Design System
- [x] Testing Strategy
- [x] Implementation Plan
- [ ] Development (8 weeks planned)

## Quick Start

*Development not started yet. See [Implementation Plan](docs/06-Implementation-Plan.md) for roadmap.*

```bash
# Coming soon
npm install
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  UI Layer   │  │ 3D Renderer │  │Audio Engine │          │
│  │  (React)    │  │ (Three.js)  │  │ (Web Audio) │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│              ┌───────────┴───────────┐                       │
│              │    Core Services      │                       │
│              │  • VRMService         │                       │
│              │  • ChatService        │                       │
│              │  • TTSService         │                       │
│              │  • ASRService         │                       │
│              └───────────┬───────────┘                       │
│                          │                                   │
│              ┌───────────┴───────────┐                       │
│              │   State (Zustand)     │                       │
│              │   Storage (IndexedDB) │                       │
│              └───────────────────────┘                       │
└──────────────────────────┬───────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ LLM APIs │     │ TTS APIs │     │   CDN    │
   │OpenAI/   │     │ElevenLabs│     │  (VRM)   │
   │Claude    │     │          │     │          │
   └──────────┘     └──────────┘     └──────────┘
```

## Target Users

1. **Lonely Young Adults** - Need emotional companionship
2. **Virtual Character Enthusiasts** - Anime/VTuber fans
3. **VTuber Creators** - Low-cost creation tool

## Success Metrics (6 months)

| Metric | Target |
|--------|--------|
| DAU | 10,000 |
| Avg Session | ≥15 min |
| D7 Retention | ≥25% |
| NPS | ≥40 |

## License

MIT

## Acknowledgments

- Inspired by [CODE27 Character Livehouse](https://www.kickstarter.com/projects/aicode27/code27-character-livehouse)
- Reference implementation: [Amica](https://github.com/semperai/amica)
