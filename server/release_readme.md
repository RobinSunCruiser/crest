# CREST Binary Release

This is a standalone binary release of CREST (Causal Relation Extraction Super Tool), a specialized platform for medical causal analysis using language models.

## Quick Start

1. **Download the binary** for your platform:
   - `crest-win.exe` - Windows
   - `crest-macos` - macOS
   - `crest-linux` - Linux

2. **Configure the application** by editing `config.json` (see Configuration section below)

3. **Run the binary**:
   ```bash
   ./crest-win.exe
   ./crest-macos
   ./crest-linux
   ```

4. **Access the application** at `http://localhost:3000`

5. **Login** with default credentials: `user` / `user`

## Configuration

The `config.json` file contains all configuration settings for CREST. Edit this file to configure your LLM providers and other settings.

### Server Configuration

```json
{
  "Log": {
    "Level": "info"
  },
  "Server": {
    "Port": 3000
  }
}
```

- `Log.Level`: Logging level (trace, debug, info, warn, error)
- `Server.Port`: Port number for the web server

### LLM Adapters

Configure your language model providers in the `LLMAdapters` section:

```json
{
  "LLMAdapters": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "provider": "openai",
      "modelFilter": [],
      "apiKey": "your-openai-api-key-here",
      "maxConcurrentRequests": 3
    },
    "anthropic": {
      "baseUrl": "https://api.anthropic.com",
      "provider": "anthropic",
      "modelFilter": [],
      "apiKey": "your-anthropic-api-key-here",
      "maxConcurrentRequests": 3
    },
    "local": {
      "baseUrl": "http://localhost:11434",
      "provider": "ollama",
      "modelFilter": [],
      "apiKey": "",
      "maxConcurrentRequests": 1
    },
    "perplexity": {
      "baseUrl": "https://api.perplexity.ai",
      "provider": "perplexityai",
      "modelFilter": [],
      "apiKey": "your-perplexity-api-key-here",
      "maxConcurrentRequests": 3
    }
  }
}
```

#### Configuration Fields

- `baseUrl`: API endpoint for the provider
- `provider`: Adapter type (`openai`, `anthropic`, `ollama`, `perplexityai`)
- `modelFilter`: Array of regex patterns to filter available models (empty array = all models)
- `apiKey`: API key for authenticated services (leave empty for Ollama)
- `maxConcurrentRequests`: Maximum simultaneous requests to prevent overloading

### Authentication

Default user configuration:

```json
{
  "Authentication": {
    "user": {
      "role": "user",
      "secret": "REPLACE_WITH_BCRYPT_HASH_GENERATED_BY_hash.js"
    }
  }
}
```

- Default username: `user`
- Default password: `user`
- The `secret` field contains a bcrypt hash of the password

## Setting Up LLM Providers

### OpenAI

1. Create an account at [https://platform.openai.com](https://platform.openai.com)
2. Generate an API key
3. Add your API key to the `openai` adapter in `config.json`

### Anthropic

1. Create an account at [https://console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Add your API key to the `anthropic` adapter in `config.json`

### Ollama (Local Models)

1. Install Ollama from [https://ollama.com](https://ollama.com)
2. Pull models you want to use:
   ```bash
   ollama pull llama3.2
   ollama pull mistral
   ```
3. Ensure Ollama is running on `http://localhost:11434`
4. The `local` adapter should work without additional configuration

### PerplexityAI

1. Create an account at [https://www.perplexity.ai](https://www.perplexity.ai)
2. Generate an API key
3. Add your API key to the `perplexity` adapter in `config.json`

## Usage

### Medical Causal Analysis Workflow

1. **Input Medical Text**: Enter text manually or upload PDF documents
2. **Entity Extraction**: CREST identifies entities
3. **Relation Analysis**: The system determines relationships between entities
4. **DAG Visualization**: View interactive causal diagrams with D3.js visualization
5. **Causal Queries**: In development ..

## Troubleshooting

### Binary Won't Start

- Ensure the binary has execute permissions:
  ```bash
  chmod +x crest-macos  # macOS/Linux
  ```
- Check that port 3000 is available
- Verify `config.json` syntax is valid

### No Models Available

- Check that your LLM providers are properly configured
- Verify API keys are correct and have sufficient credits
- For Ollama, ensure the service is running and models are pulled
- Use the "Reload Backend" button in the web interface

### Authentication Issues

- Default credentials: `user` / `user`
- To change password, use the password hashing tool or update the bcrypt hash in `config.json`

### Network Issues

- Check firewall settings for port 3000
- Verify internet connectivity for cloud-based LLM providers
- For Ollama, ensure the service is accessible at the configured URL

## File Structure

```
crest-binary/
├── crest-[platform]     # Executable binary
├── config.json          # Configuration file
└── release_readme.md    # This file
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the main project documentation
- Ensure your `config.json` is properly formatted

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0).

© 2025 University of Rostock. All rights reserved.