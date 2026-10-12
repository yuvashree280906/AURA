import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface BroadcastRecord {
  id: string;
  title: string;
  scenario: string;
  createdAt: string;
  mode: 'AURA' | 'BASELINE';
  metricsSummary?: {
    firstEssentialMs: number;
    bufferingSeconds: number;
    successRate: number;
  };
}

const memoryBroadcasts: BroadcastRecord[] = [];
const memoryReports: any[] = [];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'AURA Adaptive Broadcast Engine',
      timestamp: new Date().toISOString(),
      capabilities: ['priority_scheduling', 'real_network_throttling', 'segmented_streaming'],
    });
  });

  // Real HTTP streaming segment endpoint with controlled byte-throttling & latency
  app.get('/api/stream/chunk', async (req: Request, res: Response) => {
    const size = Math.min(Math.max(parseInt(req.query.size as string) || 32768, 256), 2 * 1024 * 1024); // max 2MB
    const throttleKbps = parseInt(req.query.throttleKbps as string) || 0; // 0 = unlimited
    const latencyMs = parseInt(req.query.latencyMs as string) || 0;
    const lossProb = parseFloat(req.query.lossProb as string) || 0;
    const segmentId = (req.query.segmentId as string) || 'seg_001';
    const type = (req.query.type as string) || 'video';

    // Simulate packet/segment drop
    if (lossProb > 0 && Math.random() < lossProb) {
      res.status(503).json({
        error: 'Simulated packet loss / network dropout',
        segmentId,
      });
      return;
    }

    // Simulate network RTT latency
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    res.setHeader('Content-Type', type === 'video' ? 'video/mp4' : 'application/octet-stream');
    res.setHeader('Content-Length', size.toString());
    res.setHeader('X-Segment-Id', segmentId);
    res.setHeader('X-Content-Type', type);
    res.setHeader('X-Throttled-Kbps', throttleKbps.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Segment-Id, X-Content-Type, X-Throttled-Kbps');

    // If throttled, stream chunks with time delays
    if (throttleKbps > 0) {
      const bytesPerSecond = (throttleKbps * 1024) / 8;
      const chunkSize = Math.max(1024, Math.floor(bytesPerSecond / 10)); // 100ms chunks
      const chunkIntervalMs = Math.round((chunkSize / bytesPerSecond) * 1000);

      let bytesSent = 0;
      const buffer = Buffer.alloc(chunkSize, 0x41); // filled with 'A' bytes

      const sendNextChunk = () => {
        if (bytesSent >= size) {
          res.end();
          return;
        }

        const remaining = size - bytesSent;
        const currentChunkSize = Math.min(chunkSize, remaining);
        const chunkToSend = currentChunkSize === chunkSize ? buffer : Buffer.alloc(currentChunkSize, 0x41);

        const ok = res.write(chunkToSend);
        bytesSent += currentChunkSize;

        if (bytesSent < size) {
          if (ok) {
            setTimeout(sendNextChunk, chunkIntervalMs);
          } else {
            res.once('drain', () => {
              setTimeout(sendNextChunk, chunkIntervalMs);
            });
          }
        } else {
          res.end();
        }
      };

      sendNextChunk();
    } else {
      // Immediate payload transfer
      const payload = Buffer.alloc(size, 0x55);
      res.end(payload);
    }
  });

  // Automated Content Preparation Pipeline (Section 9 of AURA Specification)
  // Generates video-specific critical announcements, transcripts, captions, and summaries
  app.post('/api/prepare-video-content', async (req: Request, res: Response) => {
    const { fileName, userNotes, durationSeconds, frames } = req.body;
    const cleanName = (fileName || 'Uploaded_Broadcast_Video.mp4')
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    // Check if Gemini API is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const contentParts: any[] = [];

        // Attach visual keyframes sampled directly from the user's uploaded video
        if (Array.isArray(frames) && frames.length > 0) {
          for (const f of frames.slice(0, 3)) {
            if (typeof f === 'string') {
              const b64 = f.replace(/^data:image\/\w+;base64,/, '');
              contentParts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: b64,
                },
              });
            }
          }
        }

        const promptText = `You are the video transcription and broadcast content preparation engine for AURA (Meaning-First Adaptive Broadcasting).
A user uploaded a video: "${cleanName}" (Filename: "${fileName || ''}").
${contentParts.length > 0 ? `I have attached ${contentParts.length} actual visual keyframes sampled directly from the user's uploaded video.` : ''}
User Notes / Context: "${userNotes || 'None provided'}".
Estimated Video Duration: ${durationSeconds || 45} seconds.

Please perform video understanding and speech transcription:
1. Carefully analyze what is shown or being discussed in this video based on the frames and title. Read any visible slide text, code, titles, whiteboard notes, diagrams, action, or dialogue.
2. Provide a "fullTranscription" containing the speech transcription or slide-by-slide verbal narration of this video.
3. Generate 6 prioritized broadcast items for low-bandwidth delivery:
   - item_1: critical_alert (P1_CRITICAL): The vital takeaway or most urgent finding from this video that must reach viewers even on 30 kbps.
   - item_2: caption (P2_HIGH): Verbatim speech transcript line #1 from the video.
   - item_3: caption (P2_HIGH): Verbatim speech transcript line #2 from the video.
   - item_4: summary (P2_HIGH): 3 core takeaways from the video content.
   - item_5: keyframe (P3_MEDIUM): High-contrast visual snapshot description.
   - item_6: audio_segment (P2_HIGH): Spoken voice channel stream.
   - item_7: live_video (P4_LOW): Full visual media feed.

Return strictly valid JSON:
{
  "title": "Concise broadcast title based on video content",
  "domain": "Domain category (e.g. Online Education, Technology, Medicine, Sports, News, Corporate Sync, etc.)",
  "speaker": "Identified speaker, instructor, or presenter",
  "description": "1-2 sentence description of what this video covers",
  "fullTranscription": "The speech transcript or detailed verbal narration extracted from this video",
  "items": [
    {
      "id": "item_1",
      "type": "critical_alert",
      "priority": "P1_CRITICAL",
      "title": "VITAL ALERT: [Key Takeaway]",
      "content": "The most important takeaway or instruction from this video.",
      "payloadBytes": 620,
      "deadlineSeconds": 8
    },
    {
      "id": "item_2",
      "type": "caption",
      "priority": "P2_HIGH",
      "title": "Transcript Line 1",
      "content": "Actual verbatim spoken dialogue or statement from the video.",
      "payloadBytes": 1350,
      "deadlineSeconds": 14
    },
    {
      "id": "item_3",
      "type": "caption",
      "priority": "P2_HIGH",
      "title": "Transcript Line 2",
      "content": "Continuing spoken dialogue or key explanation from the video.",
      "payloadBytes": 1400,
      "deadlineSeconds": 18
    },
    {
      "id": "item_4",
      "type": "summary",
      "priority": "P2_HIGH",
      "title": "Key Summary",
      "content": "Core 3-point summary of what is taught or presented in this video.",
      "payloadBytes": 2800,
      "deadlineSeconds": 30
    },
    {
      "id": "item_5",
      "type": "keyframe",
      "priority": "P3_MEDIUM",
      "title": "Slide / Visual Diagram Snapshot",
      "content": "Visual description of key slide or visual evidence in the video.",
      "payloadBytes": 28000,
      "deadlineSeconds": 45
    },
    {
      "id": "item_6",
      "type": "audio_segment",
      "priority": "P2_HIGH",
      "title": "Voice Stream (00-15s)",
      "content": "Clear spoken voice audio channel stream from this video.",
      "payloadBytes": 48000,
      "deadlineSeconds": 20
    },
    {
      "id": "item_7",
      "type": "live_video",
      "priority": "P4_LOW",
      "title": "Live Video Segment #1",
      "content": "High-definition video visual feed.",
      "payloadBytes": 380000,
      "deadlineSeconds": 25
    }
  ]
}`;

        contentParts.push({ text: promptText });

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: contentParts },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = geminiRes.text;
        if (text) {
          const parsed = JSON.parse(text);
          res.json({ source: 'gemini_multimodal_vision', data: parsed });
          return;
        }
      } catch (err: any) {
        console.warn('[AURA] Gemini multimodal video analysis failed, falling back to heuristic engine:', err.message);
      }
    }

    // Heuristic contextual generator matching the uploaded video's topic
    const lowerName = cleanName.toLowerCase();
    let domain = 'General Broadcast';
    let speaker = 'Broadcaster / Presenter';
    let alertTitle = `KEY TAKEAWAY: ${cleanName}`;
    let alertContent = `Essential point from "${cleanName}": Key presentation insights and instructions are active.`;
    let captionContent = `Live transcript from "${cleanName}": Discussing core concepts and demonstration details.`;
    let summaryContent = `Summary of "${cleanName}": 1. Initial overview. 2. Demonstration of primary elements. 3. Final summary and action steps.`;
    let keyframeContent = `High-contrast snapshot from "${cleanName}" showing primary visual slide.`;

    if (lowerName.includes('lecture') || lowerName.includes('class') || lowerName.includes('course') || lowerName.includes('math') || lowerName.includes('physics') || lowerName.includes('code') || lowerName.includes('algo') || lowerName.includes('learn')) {
      domain = 'Online Education & E-Learning';
      speaker = 'Lead Instructor / Faculty';
      alertTitle = `CRITICAL EXAM ALERT: ${cleanName}`;
      alertContent = `Core concept highlight from ${cleanName}: Remember key theorem, primary formula, and practical requirements for implementation.`;
      captionContent = `Transcript: "We are examining the fundamental principles shown on slide 2 of ${cleanName}."`;
      summaryContent = `Recap of ${cleanName}: 1. Core theory and architecture. 2. Step-by-step problem breakdown. 3. Practical implications.`;
      keyframeContent = `Lecture whiteboard & diagram snapshot from ${cleanName}.`;
    } else if (lowerName.includes('meeting') || lowerName.includes('call') || lowerName.includes('allhands') || lowerName.includes('sync') || lowerName.includes('quarter') || lowerName.includes('update')) {
      domain = 'Remote Meetings & Collaboration';
      speaker = 'Meeting Host / Team Lead';
      alertTitle = `ACTION ITEM: ${cleanName}`;
      alertContent = `Key decision from ${cleanName}: Deliverables assigned for sprint completion by Friday 17:00 UTC.`;
      captionContent = `Transcript: "Reviewing our quarterly performance and the immediate sprint blockers from ${cleanName}."`;
      summaryContent = `Meeting Minutes for ${cleanName}: 1. Objective review. 2. Consensus reached on key milestone. 3. Next follow-up.`;
      keyframeContent = `Shared presentation slide snapshot from ${cleanName}.`;
    } else if (lowerName.includes('match') || lowerName.includes('game') || lowerName.includes('sport') || lowerName.includes('cup') || lowerName.includes('race')) {
      domain = 'Live Sports & Entertainment';
      speaker = 'Live Commentator';
      alertTitle = `SCORE ALERT: ${cleanName}`;
      alertContent = `Breaking action from ${cleanName}: Critical point scored in second half!`;
      captionContent = `Commentary: "Tremendous defensive effort and counter-attack shown here in ${cleanName}."`;
      summaryContent = `Match Highlights: Current score updated, tactical adjustments made by coaching staff.`;
      keyframeContent = `Tactical pitch snapshot and player position diagram for ${cleanName}.`;
    } else if (lowerName.includes('news') || lowerName.includes('report') || lowerName.includes('press') || lowerName.includes('dispatch')) {
      domain = 'Breaking News & Journalism';
      speaker = 'Field Correspondent';
      alertTitle = `BREAKING BULLETIN: ${cleanName}`;
      alertContent = `Official statement received regarding ${cleanName}. Authorities have confirmed latest figures.`;
      captionContent = `Reporter: "Broadcasting live on the scene for ${cleanName} with confirmed eyewitness reports."`;
      summaryContent = `News Summary: 1. Confirmed timeline of events. 2. Official statements. 3. On-ground verification.`;
      keyframeContent = `On-scene photo and press release document for ${cleanName}.`;
    } else if (lowerName.includes('health') || lowerName.includes('med') || lowerName.includes('clinic') || lowerName.includes('patient') || lowerName.includes('doc')) {
      domain = 'Healthcare Communication';
      speaker = 'Attending Physician';
      alertTitle = `CLINICAL PROTOCOL: ${cleanName}`;
      alertContent = `Medical directive: Confirm patient stabilization guidelines and vital thresholds from ${cleanName}.`;
      captionContent = `Doctor: "Vitals remain within target parameters; proceed with standard titration."`;
      summaryContent = `Clinical Summary: Patient vitals steady, treatment plan confirmed, monitoring continued.`;
      keyframeContent = `Diagnostic telemetry strip and chart from ${cleanName}.`;
    }

    const fallbackData = {
      title: cleanName,
      domain,
      speaker,
      description: `Broadcast session for uploaded video: "${cleanName}". Prioritizing essential concepts, captions, and voice audio over low bandwidth.`,
      fullTranscription: `${captionContent} The video demonstrates core visual principles and provides primary instructions for the broadcast audience. ${summaryContent}`,
      items: [
        {
          id: `vid_alert_${Date.now()}_1`,
          type: 'critical_alert',
          priority: 'P1_CRITICAL',
          title: alertTitle,
          content: alertContent,
          payloadBytes: 580,
          deadlineSeconds: 8,
        },
        {
          id: `vid_cap_${Date.now()}_2`,
          type: 'caption',
          priority: 'P2_HIGH',
          title: `Live Transcript: ${cleanName}`,
          content: captionContent,
          payloadBytes: 1250,
          deadlineSeconds: 14,
        },
        {
          id: `vid_sum_${Date.now()}_3`,
          type: 'summary',
          priority: 'P2_HIGH',
          title: `Key Summary: ${cleanName}`,
          content: summaryContent,
          payloadBytes: 2600,
          deadlineSeconds: 30,
        },
        {
          id: `vid_img_${Date.now()}_4`,
          type: 'keyframe',
          priority: 'P3_MEDIUM',
          title: `Keyframe Snapshot: ${cleanName}`,
          content: keyframeContent,
          payloadBytes: 26000,
          deadlineSeconds: 45,
        },
        {
          id: `vid_aud_${Date.now()}_5`,
          type: 'audio_segment',
          priority: 'P2_HIGH',
          title: `Voice Audio Stream: ${cleanName} (00-15s)`,
          content: `Clear audio speech stream from ${cleanName}.`,
          payloadBytes: 44000,
          deadlineSeconds: 20,
        },
        {
          id: `vid_seg_${Date.now()}_6`,
          type: 'live_video',
          priority: 'P4_LOW',
          title: `Live Video Segment: ${cleanName} (00-10s)`,
          content: `Primary video visual feed from ${cleanName}.`,
          payloadBytes: 390000,
          deadlineSeconds: 25,
        },
      ],
    };

    res.json({ source: 'contextual_engine', data: fallbackData });
  });

  // Broadcasts persistence
  app.get('/api/broadcasts', (req: Request, res: Response) => {
    res.json({ broadcasts: memoryBroadcasts });
  });

  app.post('/api/broadcasts', (req: Request, res: Response) => {
    const { title, scenario, mode, metricsSummary } = req.body;
    const newBroadcast: BroadcastRecord = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title || 'Untitled Broadcast',
      scenario: scenario || 'General',
      mode: mode || 'AURA',
      createdAt: new Date().toISOString(),
      metricsSummary,
    };
    memoryBroadcasts.unshift(newBroadcast);
    if (memoryBroadcasts.length > 50) memoryBroadcasts.pop();
    res.status(201).json(newBroadcast);
  });

  // Reports persistence
  app.get('/api/reports', (req: Request, res: Response) => {
    res.json({ reports: memoryReports });
  });

  app.post('/api/reports', (req: Request, res: Response) => {
    const report = {
      ...req.body,
      id: req.body.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      savedAt: new Date().toISOString(),
    };
    memoryReports.unshift(report);
    if (memoryReports.length > 50) memoryReports.pop();
    res.status(201).json(report);
  });

  // In production, serve dist static files; in dev, attach Vite middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AURA] Core Broadcast & Streaming Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AURA] Server failed to start:', err);
  process.exit(1);
});
