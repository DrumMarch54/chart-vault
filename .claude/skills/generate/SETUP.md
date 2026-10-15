# /generate Skill Setup

Your `/generate` skill is ready to use. Before generating video, you need to add your **Kie AI API key** to `.env`.

## Step 1: Get your Kie AI API key

1. Visit **[https://kie.ai/api-key](https://kie.ai/api-key)**
2. Log in (sign up if needed)
3. Copy your API Key (Bearer token format)
4. Open `.env` in your project root
5. Find the line: `KIE_API_KEY=your_kie_ai_bearer_token_here`
6. Replace `your_kie_ai_bearer_token_here` with your actual key

**Example:**
```
KIE_API_KEY=sk-...your_actual_bearer_token_here...
```

## Step 2: Test it

Once the key is in `.env`, you can use the skill:

```
/generate a 5-second product video of a water bottle using grok
```

I'll quote the cost ($0.075), wait for your approval, then generate.

## Video model

- **Grok Imagine 1.5** — $0.075 per 5-sec video, the only video model this pipeline uses

## Important

- The skill uses your existing `KIE_API_KEY` from `.env` — keep it secret, never commit it to git
- Every video generation will ask for approval before running
- Videos save flat into `generations/` folder with a `.json` log file next to them showing the prompt and cost
