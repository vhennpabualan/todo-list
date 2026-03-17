# TaskFlow AI Setup Guide

## Getting Your OpenRouter API Key

TaskFlow integrates with **OpenRouter** for real AI-powered assistance with multiple model options!

### Step 1: Get Your Free API Key

1. Visit: https://openrouter.ai/keys
2. Sign up or log in
3. Create a new API key
4. Copy your API key

### Step 2: Add API Key to TaskFlow

**Option A: Environment Variable (Recommended)**
1. Add your key to `.env` file:
   ```
   VITE_OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```
2. Restart your dev server
3. Key is automatically loaded

**Option B: Manual Entry**
1. Open TaskFlow in your browser
2. Click the **"Open Assistant"** button in the sidebar
3. A prompt will ask for your API key
4. Paste your API key and press Enter
5. Your key is saved locally in your browser

### Step 3: Start Using AI

Now you can ask the AI assistant:
- "Help me prioritize my tasks"
- "What should I focus on today?"
- "Give me productivity tips"
- "How can I manage my time better?"
- "Summarize my tasks"
- And much more!

## Features

✨ **Real AI Responses** - Powered by OpenRouter (GPT-3.5, Claude, and more)
🔒 **Secure** - Your API key is stored locally, never sent to our servers
💬 **Context-Aware** - AI knows about your tasks and productivity
🚀 **Free Tier** - OpenRouter offers a free tier with credits

## Free Tier Limits

- **Free credits** - Enough for personal use
- **Multiple models** - Choose from GPT-3.5, Claude, and others
- **No credit card required** - Start free

## Troubleshooting

**"API request failed"**
- Check that your API key is correct
- Make sure you're using the right API key from https://openrouter.ai/keys
- Try refreshing the page

**"Invalid API key"**
- Your API key might be expired or incorrect
- Visit https://openrouter.ai/keys to generate a new one

**Want to change your API key?**
- Clear your browser's localStorage for this site
- Or manually delete the 'aimlApiKey' from browser storage
- Or update your `.env` file and restart

## Privacy

- Your API key is stored only in your browser's localStorage (or .env file)
- No data is sent to TaskFlow servers
- All communication is directly with OpenRouter

## Getting Started

1. Go to https://openrouter.ai/keys
2. Create your free API key
3. Add to `.env` file or paste when prompted in TaskFlow
4. Start chatting with AI!

Enjoy your AI-powered productivity! 🚀
