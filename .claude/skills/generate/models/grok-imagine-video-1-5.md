# Grok Imagine Video 1.5

Fast, cheap video from image. 720p, 5 seconds, 9:16 aspect ratio. Best for testing and iteration.

| Field | Value |
|---|---|
| Model ID | grok-imagine-video-1-5-preview |
| Provider | Kie AI |
| Method | Async (submit task, poll status) |
| Type | Video |
| API key | .env → KIE_API_KEY |
| Docs | https://kie.ai/pricing |
| Cost | $0.015 per second @ 720p ($0.075 for 5-sec video) |

## Endpoint

```
POST https://api.kie.ai/api/v1/jobs/createTask
Authorization: Bearer {KIE_API_KEY}
```

## Request format

```json
{
  "model": "grok-imagine-video-1-5-preview",
  "input": {
    "prompt": "[user prompt here — keep it clear and visual]",
    "image_urls": ["data:image/png;base64,[base64 encoded image]"],
    "aspect_ratio": "9:16",
    "resolution": "720p",
    "duration": 5,
    "nsfw_checker": true
  }
}
```

The API returns `{code: 200, data: {taskId: "..."}}` on success.

## Polling

```
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Authorization: Bearer {KIE_API_KEY}
```

Poll every 3-5 seconds. Response field `data.state` indicates status:
- `"waiting"` — still processing, keep polling
- `"success"` — done; video URL in `data.resultJson` (JSON string, parse it: `{resultUrls: ["..."]}`)
- `"fail"` — error in `data.failMsg`

Video URL will expire in a few hours — **download immediately** when status is success.

## Notes

- Max prompt length: 4096 characters
- 9:16 aspect ratio is built-in (no need to request portrait — always vertical)
- Image can be base64 embedded (as shown above) or a public URL
- One image per request — feed the Nano Banana-generated product image
- NSFW filter enabled by default
