# AURA API Specification & Testing Guidelines

## Backend API Endpoints (`server.ts`)

### 1. Health Probe
- **Method**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "AURA Adaptive Broadcast Engine",
    "timestamp": "2026-10-11T09:00:00.000Z",
    "capabilities": ["priority_scheduling", "real_network_throttling", "segmented_streaming"]
  }
  ```

### 2. Real HTTP Chunk Streaming & Socket Throttling
- **Method**: `GET /api/stream/chunk`
- **Query Parameters**:
  - `size` (integer): Payload size in bytes (256 to 2,097,152). Default: 32768.
  - `throttleKbps` (integer): Artificial rate limit in kbps. Default: 0 (unthrottled).
  - `latencyMs` (integer): Artificial delay in ms before response begins. Default: 0.
  - `lossProb` (float): Probability of simulated packet/segment drop (0.0 to 1.0).
  - `segmentId` (string): Unique identifier for the chunk.
  - `type` (string): 'video', 'audio', 'keyframe', 'caption', 'alert'.
- **Headers Returned**:
  - `Content-Length`: Exact payload size.
  - `X-Segment-Id`: Requested segment identifier.
  - `X-Content-Type`: Media type.
  - `X-Throttled-Kbps`: Active bandwidth cap.

### 3. Multimodal Video Transcription & Content Preparation
- **Method**: `POST /api/prepare-video-content`
- **Body**:
  ```json
  {
    "fileName": "lecture_distributed_systems.mp4",
    "durationSeconds": 45,
    "userNotes": "Key focus on Byzantine Fault Tolerance",
    "frames": ["data:image/jpeg;base64,..."]
  }
  ```
- **Response**:
  ```json
  {
    "source": "gemini_multimodal_vision",
    "data": {
      "title": "Distributed Systems & Quorum Consensus",
      "domain": "Online Education & E-Learning",
      "speaker": "Lead Instructor",
      "description": "Lecture on Byzantine fault tolerance and quorum requirements.",
      "fullTranscription": "Transcript text extracted from the video...",
      "items": [ ... ]
    }
  }
  ```

### 4. Broadcasts and Test Reports
- **Method**: `GET /api/broadcasts`, `POST /api/broadcasts`
- **Method**: `GET /api/reports`, `POST /api/reports`

## Testing Guidelines

Run TypeScript validation:
```bash
npm run lint
```

Build production bundle:
```bash
npm run build
```

Run test suite via Network Lab:
1. Open the **Network Lab** tab.
2. Select payload size (16 KB to 800 KB).
3. Set bandwidth cap (e.g. 120 kbps).
4. Click **"Execute Real HTTP Chunk Download Test"** to verify socket streaming.
