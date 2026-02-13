# SplitC Discord Agent

A production-ready NestJS application for Discord bot interactions, built for the SplitC team.

## Features

- ✅ Discord Interactions API with Ed25519 signature verification
- ✅ Modular architecture (Discord, Config, Common modules)
- ✅ Type-safe DTOs and validation
- ✅ Global exception handling and logging
- ✅ Environment-based configuration
- ✅ HTTPS-ready for Discord webhook integration

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Discord Application (from [Discord Developer Portal](https://discord.com/developers/applications))

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Discord credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Discord application details:

```env
PORT=3000
DISCORD_PUBLIC_KEY=your_public_key_from_discord_portal
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_BOT_TOKEN=your_bot_token
NODE_ENV=development
```

**Where to find these values:**
- Go to [Discord Developer Portal](https://discord.com/developers/applications)
- Select your application
- **Public Key**: General Information page
- **Client ID**: General Information page (Application ID)
- **Bot Token**: Bot page (you may need to reset it to see it)

### 3. Run the Application

**Development mode:**
```bash
pnpm run start:dev
```

**Production build:**
```bash
pnpm run build
pnpm run start:prod
```

## Discord Integration

### Setting up the Interactions Endpoint

1. **Expose your local server** (for development):
   - Use a tunneling service like [ngrok](https://ngrok.com/):
     ```bash
     ngrok http 3000
     ```
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

2. **Configure Discord**:
   - Go to your application in the Discord Developer Portal
   - Navigate to General Information
   - Set **Interactions Endpoint URL** to: `https://your-domain.com/discord/interactions`
   - Discord will send a PING request to verify the endpoint
   - If configured correctly, you'll see a success message

### Available Endpoints

#### `POST /discord/interactions`
Main endpoint for Discord interactions. Handles:
- PING/PONG verification
- Application commands (slash commands)
- Message components (buttons, select menus)
- Modal submissions

**Security**: Protected by Ed25519 signature verification middleware.

#### `POST /discord/verify-user`
Custom endpoint for user verification flows.

**Request body:**
```json
{
  "userId": "discord_user_id",
  "guildId": "discord_guild_id",
  "code": "optional_verification_code"
}
```

## Project Structure

```
src/
├── common/
│   ├── filters/          # Global exception filters
│   └── interceptors/     # Request/response interceptors
├── config/
│   ├── config.module.ts  # Configuration module
│   └── config.service.ts # Environment variable management
├── discord/
│   ├── dto/              # Data transfer objects
│   ├── middleware/       # Signature verification
│   ├── types/            # TypeScript types
│   ├── discord.controller.ts
│   ├── discord.service.ts
│   └── discord.module.ts
├── app.module.ts         # Root module
└── main.ts               # Application bootstrap
```

## Development

**Linting:**
```bash
pnpm run lint
```

**Format code:**
```bash
pnpm run format
```

## Security

- All Discord interactions are verified using Ed25519 signature verification
- Invalid signatures are rejected with 401 Unauthorized
- Environment variables are validated on startup
- Global exception handling prevents information leakage

## Extending the Bot

To add new slash commands or interactions:

1. Update `discord.service.ts` with your command logic
2. Register commands via Discord API or Developer Portal
3. Handle the interaction in the appropriate method

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Ensure HTTPS is enabled (required by Discord)
3. Update the Interactions Endpoint URL in Discord Developer Portal
4. Consider using PM2 or similar for process management

## License

UNLICENSED - Private project for SplitC
