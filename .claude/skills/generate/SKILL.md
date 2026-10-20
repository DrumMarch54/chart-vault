---
name: generate
description: Generate images and videos via AI model APIs. Triggers on /generate, generate video, create video, animate, test video model.
---

# /generate

## Video Models

| Task | Default model | Recipe | Cost per 5-sec video |
|---|---|---|---|
| Video | Grok Imagine 1.5 | models/grok-imagine-video-1-5.md | $0.075 |

## Before generating any video:

1. **Quote the cost and wait for explicit approval** — Never generate without asking first.
2. **Show which model** — "Using Grok Imagine 1.5 on Kie AI"
3. **Show the duration and resolution** — "5 seconds, 720p"
4. **Show the total cost** — "Total cost: $0.075"
5. One approval = one run. If you regenerate, ask again.

## Output

- Save every file FLAT into: `generations/`
- No subfolders. Reference images live in `generations/refs/`
- Naming: `{description}_{timestamp}.mp4`

## Rules

- Always use Grok Imagine 1.5 for video generation.
- If a reference image is needed, ask the user to provide it or tell me where to find it.
- Run one generation at a time to avoid rate limits.
- After every save, write a sidecar `.json` log next to the video with model, prompt, and cost.
- Never describe an image — pass the real file as a reference if needed.
