# AURA System Architecture & Mathematical Foundations

## 1. System Overview

AURA decomposes broadcasting into meaning-based priority tiers, prioritizing critical information, transcripts, and voice audio when network bandwidth drops below acceptable thresholds for video.

```
                      +-----------------------------+
                      |     Uploaded Video / Clip   |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               | Client-Side HTML5 Canvas Frame Extraction |
               +---------------------+---------------------+
                                     | (Base64 JPEG Frames)
                                     v
                 +---------------------------------------+
                 | POST /api/prepare-video-content       |
                 | (Gemini 3.8 Flash Multimodal Vision)  |
                 +-------------------+-------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  Dynamic Priority Queue (Content Items)                 |
|  [P1 Critical Alerts] -> [P2 Captions/Audio] -> [P3 Keyframes] -> [P4 Video] |
+------------------------------------+------------------------------------+
                                     |
                                     v
               +-------------------------------------------+
               | AURA Scheduling Engine vs Baseline FIFO  |
               +---------------------+---------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    [Model Simulation Path]                    [Real Socket Throttling Path]
 (Mathematical latency & drops)             (ReadableStream on /api/stream/chunk)
```

## 2. Priority Scheduling Formulation

Every item $i$ in the pending transmission queue is evaluated at tick $t$ using the priority function:

$$S(i, t) = \left( W_{\text{priority}}(i) \cdot W_{\text{type}}(i) \cdot U_{\text{deadline}}(i, t) + A_{\text{age}}(i, t) \right) \cdot C_{\text{bandwidth}}(i, B)$$

Where:
- **Base Priority Weight** $W_{\text{priority}}$:
  - `P1_CRITICAL`: $10,000$
  - `P2_HIGH`: $3,000$
  - `P3_MEDIUM`: $800$
  - `P4_LOW`: $150$

- **Content Type Weight** $W_{\text{type}}$:
  - `critical_alert`: $15.0$
  - `caption`: $8.0$
  - `summary`: $5.0$
  - `audio_segment`: $4.0$
  - `keyframe`: $3.0$
  - `live_video`: $1.5$
  - `deferred_video`: $0.5$

- **Deadline Urgency Multiplier** $U_{\text{deadline}}(i, t)$:
  $$\tau_{\text{rem}} = \max\left(0.1, \text{deadline}_i - (t - \text{created}_i)\right)$$
  $$\hat{T}_{\text{xfer}} = \frac{8 \cdot \text{size}_i}{B \cdot 1024} + \text{RTT} \cdot \left(1 + \frac{\text{Loss}}{100}\right)$$
  If $\tau_{\text{rem}} < 2 \cdot \hat{T}_{\text{xfer}}$, $U = 2.5$; if $\tau_{\text{rem}} < 4 \cdot \hat{T}_{\text{xfer}}$, $U = 1.6$; otherwise $U = 1.0$.

- **Anti-Starvation Aging Credit** $A_{\text{age}}(i, t)$:
  $$A_{\text{age}} = (t - \text{created}_i) \cdot 25$$
  This linear credit accumulates over time to prevent lower-priority elements from starving when bandwidth permits.

- **Capacity Gate Factor** $C_{\text{bandwidth}}(i, B)$:
  When bandwidth $B < 120\text{ kbps}$, heavy video segments receive $C = 0.05$, immediately freeing up channel capacity for sub-kilobyte text alerts and compressed voice chunks.

## 3. Live-First Recovery

When network throughput recovers:
1. Conventional streaming attempts to drain stale, accumulated video buffers, keeping viewers minutes behind real-time.
2. AURA discards expired segments and immediately reconnects viewers to current live announcements and audio.
3. Missing visual segments are marked as `deferred_video` and downloaded in the background using spare bandwidth without blocking the live flow.
