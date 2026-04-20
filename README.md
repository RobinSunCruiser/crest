# CREST (Causal Relation Extraction Super Tool)

CREST is a research platform for extracting causal relationships from medical texts using Large Language Models. It implements Judea Pearl's Causality Framework to construct Directed Acyclic Graphs (DAGs) from clinical literature.

![CREST Demo](doc/crest.gif)

## Quick Start

```bash
# Server setup
cd server
cp .env.example .env  # Add your API keys
npm install && npm run dev

# Client setup (separate terminal)
cd client
cp .env.example .env
npm install && npm run dev

# Access at http://localhost:5173
# Default login: user / user
```

## Features

- **Multi-LLM Support**: OpenAI, Anthropic, PerplexityAI, and Ollama (local/remote)
- **Causal Extraction Pipeline**: Entity → Relation → Probability extraction
- **Interactive DAG Visualization**: D3.js force-directed graph with zoom/pan
- **Graph Comparison**: Graph Edit Distance (GED) metrics with node mapping
- **Configurable Prompts**: Customizable extraction templates for research
- **PDF Processing**: Multi-page document analysis with page tracking

## Project Structure

```
crest/
├── client/          # React frontend (Vite + Mantine UI)
├── server/          # Node.js backend (Express + Socket.IO)
├── build/           # Production build output
└── doc/             # Documentation and research report
```

## Configuration

The server is configured through two mechanisms: environment variables (`.env`) and a JSON config file (`config.json`).

### Environment Variables (server/.env)

Copy `server/.env.example` to `server/.env` and fill in your values:

```bash
JWT_SECRET=your-64-character-secret       # Required for production
OPENAI_API_KEY=sk-proj-...                # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...              # Anthropic API key
PERPLEXITYAI_API_KEY=pplx-...            # PerplexityAI API key
PORT=3000                                 # Server port (optional)
```

API keys are resolved in priority order: adapter constructor > `config.json` > environment variable.

### Server Config (server/src/file/config.json)

```json
{
    "Log":            { "Level": "trace" },
    "Server":         { "Port": 3000, "JWTSecret": "" },
    "LLMAdapters":    { ... },
    "Authentication": { ... },
    "Embeddings":     { ... }
}
```

| Section | Purpose |
|---|---|
| `Log.Level` | Log verbosity: `trace`, `debug`, `info`, `warn`, `error` |
| `Server.Port` | TCP port (fallback if `PORT` env var is not set) |
| `Server.JWTSecret` | JWT signing secret (fallback if `JWT_SECRET` env var is not set) |
| `LLMAdapters` | LLM provider connections (see below) |
| `Authentication` | User credentials (bcrypt-hashed passwords) |
| `Embeddings` | Embedding model configuration referencing an LLM adapter |

### LLM Adapters

Each adapter is a named entry under `LLMAdapters`:

```json
"my_adapter": {
    "baseUrl": "https://api.openai.com/v1",
    "provider": "openai",
    "modelFilter": [],
    "apiKey": "",
    "maxConcurrentRequests": 3
}
```

| Property | Description |
|---|---|
| `baseUrl` | API endpoint URL |
| `provider` | Provider type: `openai`, `anthropic`, `perplexityai`, or `ollama` |
| `modelFilter` | Regex array to filter available models (empty = show all) |
| `apiKey` | API key (can be empty if set via environment variable) |
| `maxConcurrentRequests` | Max parallel requests to this provider |

For the full configuration reference, see the [Configuration Guide](server/src/file/Configuration.md).

## Production Build

```bash
# From root directory
npm run build     # Build client + server to build/dist/
npm run start     # Run production server
npm run release   # Create platform binaries (build/release/)
```

## Documentation

- [Technical Research Report](doc/Report.md) - Architecture, extraction pipeline, and research contributions
- [Configuration Guide](server/src/file/Configuration.md) - Detailed server configuration
- [Client Developer FAQ](client/ClientDeveloperFAQ.md) - Client architecture and development
- [Server Developer FAQ](server/ServerDeveloperFAQ.md) - Server architecture and customization

## License

Created by Dr.-Ing. Robin Nicolay, Felix Gratzkowski and Dr. rer. nat. Sebastian Bader at the University of Rostock.

Developed as part of the KI-Med Collaboration Platform (KiMeKo) project, funded by BMBF (funding code 01IS24056D).

Licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)

© 2024 University of Rostock. All rights reserved.
