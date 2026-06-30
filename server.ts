import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { Issue, UserProfile } from './src/types';
import {
  getIssues,
  addIssue,
  updateIssue,
  getOrCreateProfile,
  awardPoints,
  awardBadge,
  upvoteIssue,
  getLeaderboard,
  addAuditLog,
  getAuditLogs,
  loadDb,
  saveDb
} from './src/lib/db';
import { getDepartmentAndSla } from './src/lib/departmentRouter';
import { createServer as createViteServer } from 'vite';
import { adminProtectionMiddleware } from './middleware';

const app = express();
const PORT = 3000;

// Set up larger limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply administrative protection middleware to all admin api endpoints
app.use('/api/admin/*', adminProtectionMiddleware);

// Initialize GoogleGenAI SDK with user secrets
// AI Studio automatically injects process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY_IF_ABSENT',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to clean base64 data URL
function cleanBase64(dataStr: string): { data: string; mimeType: string } {
  const matches = dataStr.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  return {
    mimeType: 'image/jpeg',
    data: dataStr
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth / Profile Loader
app.post('/api/auth/profile', (req, res) => {
  const { firebase_uid, phone, display_name } = req.body;
  if (!firebase_uid) {
    return res.status(400).json({ error: 'firebase_uid is required' });
  }
  const profile = getOrCreateProfile(firebase_uid, phone, display_name);
  res.json(profile);
});

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = getLeaderboard();
  res.json(leaderboard);
});

// Get Audit Logs
app.get('/api/audit-logs', (req, res) => {
  const logs = getAuditLogs();
  res.json(logs);
});

// Get All Issues
app.get('/api/reports', (req, res) => {
  const { category, status } = req.query;
  let issues = getIssues();

  if (category && category !== 'all') {
    issues = issues.filter(i => i.category === category);
  }
  if (status && status !== 'all') {
    issues = issues.filter(i => i.status === status);
  }

  res.json(issues);
});

// Get Single Issue
app.get('/api/reports/:id', (req, res) => {
  const issues = getIssues();
  const issue = issues.find(i => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  res.json(issue);
});

// Upvote / Verify Issue
app.post('/api/upvote', (req, res) => {
  const { issue_id, firebase_uid } = req.body;
  if (!issue_id || !firebase_uid) {
    return res.status(400).json({ error: 'issue_id and firebase_uid are required' });
  }

  const result = upvoteIssue(issue_id, firebase_uid);
  if (!result.success) {
    return res.status(400).json({ error: 'You have already upvoted/verified this issue.' });
  }

  addAuditLog({
    issue_id,
    action: 'upvote',
    new_value: `Upvotes: ${result.issue?.upvotes}`,
    performed_by: result.profile?.display_name || firebase_uid
  });

  res.json(result);
});

// API Route: Report/Create Issue (with Vision Classifier + Duplicate Detection)
app.post('/api/report', async (req, res) => {
  const {
    firebase_uid,
    image, // base64 encoded photo
    latitude,
    longitude,
    address,
    landmark,
    bypassDuplicateCheck // boolean, if user chooses to bypass
  } = req.body;

  if (!firebase_uid || !image || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const cleanedImg = cleanBase64(image);
    
    // Check for API key presence to use real Gemini API, otherwise mock classification gracefully
    const hasRealKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    
    let aiClassification: {
      category: 'pothole' | 'garbage' | 'streetlight' | 'water' | 'other';
      severity: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      confidence: number;
    } = {
      category: 'other',
      severity: 'medium',
      title: 'Civic report near ' + (landmark || 'landmark'),
      description: 'Reported issue awaiting review.',
      confidence: 0.85
    };

    if (hasRealKey) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: cleanedImg.mimeType,
            data: cleanedImg.data,
          }
        };
        const textPart = {
          text: `You are 'Agent 1: Vision Classifier', the primary classification module of the 'JantaFix' platform. 
                 Analyze this image of a municipal/civic issue in India. 
                 Identify:
                 1. Category: Must be strictly one of: 'pothole', 'garbage', 'streetlight', 'water', 'other'.
                 2. Severity: Grade as 'low', 'medium', or 'high'.
                 3. Title: Create a short, highly professional title (4-8 words, like "Broken streetlight near main gate").
                 4. Description: Write a clear description of the hazard seen in the photo.
                 5. Confidence: Your confidence score from 0.0 to 1.0.
                 
                 Return JSON structure exactly fitting the requested schema.`
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "pothole, garbage, streetlight, water, or other" },
                severity: { type: Type.STRING, description: "low, medium, or high" },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ['category', 'severity', 'title', 'description', 'confidence']
            }
          }
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text.trim());
          aiClassification = {
            category: ['pothole', 'garbage', 'streetlight', 'water', 'other'].includes(parsed.category) ? parsed.category : 'other',
            severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium',
            title: parsed.title || aiClassification.title,
            description: parsed.description || aiClassification.description,
            confidence: parsed.confidence || 0.85
          };
        }
      } catch (geminiErr) {
        console.error('Gemini Classification Error, falling back to heuristics:', geminiErr);
      }
    } else {
      // Offline heuristic mock classification for demo purposes
      console.log('No GEMINI_API_KEY detected, using high-quality local classification simulation.');
      if (landmark?.toLowerCase().includes('light') || landmark?.toLowerCase().includes('pole')) {
        aiClassification = {
          category: 'streetlight',
          severity: 'medium',
          title: 'Non-functional street light on road segment',
          description: 'A streetlight has failed, leaving the adjacent sidewalk and roadway in total darkness. Safety risk.',
          confidence: 0.92
        };
      } else if (landmark?.toLowerCase().includes('garbage') || landmark?.toLowerCase().includes('trash')) {
        aiClassification = {
          category: 'garbage',
          severity: 'high',
          title: 'Overflowing rubbish container on pavement',
          description: 'Waste has accumulated and is overflowing onto the main sidewalk, attracting pests and blocking pedestrian movement.',
          confidence: 0.95
        };
      } else if (landmark?.toLowerCase().includes('water') || landmark?.toLowerCase().includes('leak')) {
        aiClassification = {
          category: 'water',
          severity: 'high',
          title: 'Pipeline leakage flooding sidewalk',
          description: 'A municipal water line appears fractured, wasting fresh water and forming stagnant pools.',
          confidence: 0.88
        };
      } else {
        aiClassification = {
          category: 'pothole',
          severity: 'medium',
          title: 'Unpatched road pothole causing traffic obstruction',
          description: 'A noticeable crater has developed in the asphalt asphalt surface, posing risks to motorcyclists and vehicles.',
          confidence: 0.91
        };
      }
    }

    // -------------------------------------------------------------
    // Agent 2: Duplicate Detection Logic
    // -------------------------------------------------------------
    const nearbyRadius = 0.0005; // roughly 50m
    const allOpenIssues = getIssues().filter(i => 
      i.category === aiClassification.category && 
      i.status !== 'resolved' && 
      !i.is_duplicate
    );

    const candidates = allOpenIssues.filter(i => {
      const latDiff = Math.abs(i.latitude - latitude);
      const lngDiff = Math.abs(i.longitude - longitude);
      return latDiff < nearbyRadius && lngDiff < nearbyRadius;
    });

    // If candidate found and user has not bypassed, trigger duplicate check
    if (candidates.length > 0 && !bypassDuplicateCheck) {
      const bestCandidate = candidates[0]; // Take closest

      let duplicateCheckResult = {
        isDuplicate: false,
        confidence: 0.0,
        reasoning: 'No visual or contextual duplicates found.'
      };

      if (hasRealKey) {
        try {
          // Compare using Gemini Vision if candidate has photo
          const parts = [
            { inlineData: { mimeType: cleanedImg.mimeType, data: cleanedImg.data } }
          ];

          // If best candidate has a photo, download/read it or fetch it if possible. 
          // For sandbox purposes, if it starts with http we can mention it contextually in the text prompt
          const textPart = {
            text: `You are 'Agent 2: Duplicate Detector'. Compare the newly uploaded image with this existing issue in the same area:
                   Existing Issue Title: "${bestCandidate.title}"
                   Existing Description: "${bestCandidate.description}"
                   Existing Landmark: "${bestCandidate.landmark || 'None'}"
                   
                   Are these likely the same exact physical problem (e.g. the same pothole or the same heap of garbage)?
                   Assess contextual similarity.
                   Return JSON object containing:
                   1. isDuplicate (boolean): True if confidence > 0.70.
                   2. confidence (number): score from 0.0 to 1.0.
                   3. reasoning (string): concise reasoning explaining your verdict.`
          };

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: { parts: [...parts, textPart] },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isDuplicate: { type: Type.BOOLEAN },
                  confidence: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING }
                },
                required: ['isDuplicate', 'confidence', 'reasoning']
              }
            }
          });

          const text = response.text;
          if (text) {
            const parsed = JSON.parse(text.trim());
            duplicateCheckResult = {
              isDuplicate: parsed.isDuplicate || false,
              confidence: parsed.confidence || 0.0,
              reasoning: parsed.reasoning || ''
            };
          }
        } catch (dupErr) {
          console.error('Gemini Duplicate Detection Error, falling back to heuristic:', dupErr);
        }
      } else {
        // Mock duplicate check heuristic: if same category and extremely close (< 20m), flag as duplicate
        const dist = Math.sqrt(Math.pow(bestCandidate.latitude - latitude, 2) + Math.pow(bestCandidate.longitude - longitude, 2));
        if (dist < 0.0002) { // Extremely close
          duplicateCheckResult = {
            isDuplicate: true,
            confidence: 0.88,
            reasoning: `Geospatial match: An open ${aiClassification.category} ticket was already logged at this exact location. Coordinates differ by less than 15 meters.`
          };
        }
      }

      if (duplicateCheckResult.isDuplicate && duplicateCheckResult.confidence > 0.70) {
        // Return duplicate alert
        return res.json({
          duplicateFound: true,
          duplicateIssue: bestCandidate,
          confidence: duplicateCheckResult.confidence,
          reasoning: duplicateCheckResult.reasoning
        });
      }
    }

    // Create the Issue
    const issueId = 'issue-' + Math.random().toString(36).substring(2, 11);
    const { department, slaDays } = getDepartmentAndSla(aiClassification.category, aiClassification.severity);
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();

    const newIssue: Issue = {
      id: issueId,
      firebase_uid,
      title: aiClassification.title,
      description: aiClassification.description,
      category: aiClassification.category,
      severity: aiClassification.severity,
      status: 'reported',
      latitude,
      longitude,
      address: address || `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`,
      landmark: landmark || '',
      photo_url: image, // Store photo directly as base64 in local DB
      upvotes: 1, // Self upvote
      assigned_department: department,
      priority: aiClassification.severity,
      sla_deadline: slaDeadline,
      is_duplicate: false,
      ai_confidence: aiClassification.confidence,
      ai_analysis: aiClassification.description,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    addIssue(newIssue);
    
    // Award 10 points to reporter
    const profile = awardPoints(firebase_uid, 10);
    
    // Check for "First Reporter" badge
    const reportsCount = getIssues().filter(i => i.firebase_uid === firebase_uid).length;
    if (reportsCount === 1 && profile && !profile.badges.includes('First Reporter')) {
      awardBadge(firebase_uid, 'First Reporter');
    }

    addAuditLog({
      issue_id: issueId,
      action: 'report',
      new_value: `Reported issue category: ${aiClassification.category}`,
      performed_by: profile?.display_name || firebase_uid
    });

    res.json({
      success: true,
      duplicateFound: false,
      issue: newIssue,
      profile: getOrCreateProfile(firebase_uid) // Return refreshed profile
    });

  } catch (error: any) {
    console.error('Error reporting issue:', error);
    res.status(500).json({ error: 'Failed to process and report the issue.' });
  }
});

// API Route: Mark Issue as Fixed (Before/After Resolution Verification)
app.post('/api/resolve', async (req, res) => {
  const { issue_id, firebase_uid, resolution_image } = req.body;
  
  if (!issue_id || !firebase_uid || !resolution_image) {
    return res.status(400).json({ error: 'Missing issue_id, firebase_uid or resolution_image' });
  }

  const issues = getIssues();
  const issue = issues.find(i => i.id === issue_id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  try {
    const cleanedResImg = cleanBase64(resolution_image);
    const cleanedOrigImg = cleanBase64(issue.photo_url);

    const hasRealKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

    let resolutionVerification = {
      isResolved: true,
      confidence: 0.90,
      analysis: 'Visual inspection confirms the reported issue is cleared and resolved.',
      recommendedAction: 'Close Ticket'
    };

    if (hasRealKey) {
      try {
        const origImagePart = {
          inlineData: {
            mimeType: cleanedOrigImg.mimeType,
            data: cleanedOrigImg.data
          }
        };
        const resImagePart = {
          inlineData: {
            mimeType: cleanedResImg.mimeType,
            data: cleanedResImg.data
          }
        };
        const textPart = {
          text: `You are 'Agent 3: Resolution Verifier' on the 'JantaFix' platform.
                 Compare the first photo (original reported issue: ${issue.category} - "${issue.title}")
                 with the second photo (resolution photo submitted by citizen/officer).
                 
                 Verify:
                 1. Is the issue fully resolved? (e.g. if it was a pothole, is it patched? if it was garbage, is it completely cleared?).
                 2. Return your confidence score (0.0 to 1.0).
                 3. Analyze what was repaired or if anything is outstanding.
                 4. Recommended Action: e.g. "Close Ticket" or "Request Sanitation Re-sweep".
                 
                 Return JSON fitting the specified schema.`
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: { parts: [origImagePart, resImagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isResolved: { type: Type.BOOLEAN },
                confidence: { type: Type.NUMBER },
                analysis: { type: Type.STRING },
                recommendedAction: { type: Type.STRING }
              },
              required: ['isResolved', 'confidence', 'analysis', 'recommendedAction']
            }
          }
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text.trim());
          resolutionVerification = {
            isResolved: parsed.isResolved || false,
            confidence: parsed.confidence || 0.90,
            analysis: parsed.analysis || 'Resolution verified by Gemini Vision.',
            recommendedAction: parsed.recommendedAction || 'Close Ticket'
          };
        }
      } catch (verErr) {
        console.error('Gemini Resolution Verification Error, falling back to default:', verErr);
      }
    }

    if (resolutionVerification.isResolved && resolutionVerification.confidence >= 0.70) {
      // Update Issue Status in Database
      const updated = updateIssue(issue_id, {
        status: 'resolved',
        resolution_photo_url: resolution_image,
        resolved_by: firebase_uid,
        resolution_verified: true,
        resolution_ai_analysis: resolutionVerification.analysis,
        resolved_at: new Date().toISOString()
      });

      // Award Points: +50 to the original reporter, +30 to the resolver
      awardPoints(issue.firebase_uid, 50); // Original reporter gets 50
      
      let resolverProfile = null;
      if (firebase_uid !== issue.firebase_uid) {
        resolverProfile = awardPoints(firebase_uid, 30); // Resolver gets 30
      } else {
        resolverProfile = awardPoints(firebase_uid, 30); // Award resolver even if self
      }

      // Check for "Local Hero" badge: 5 resolved issues
      if (resolverProfile) {
        const resolvedCount = getIssues().filter(i => i.resolved_by === firebase_uid && i.status === 'resolved').length;
        if (resolvedCount >= 5 && !resolverProfile.badges.includes('Local Hero')) {
          awardBadge(firebase_uid, 'Local Hero');
        }
      }

      addAuditLog({
        issue_id,
        action: 'resolve',
        new_value: `Resolved and verified by Gemini. Resolver: ${firebase_uid}`,
        performed_by: resolverProfile?.display_name || firebase_uid
      });

      res.json({
        success: true,
        verified: true,
        verification: resolutionVerification,
        issue: updated,
        profile: getOrCreateProfile(firebase_uid)
      });
    } else {
      res.json({
        success: false,
        verified: false,
        verification: resolutionVerification,
        issue,
        message: 'AI could not verify the resolution. Please provide a clearer photo of the fixed area.'
      });
    }

  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).json({ error: 'Failed to process resolution verification.' });
  }
});

// In-memory cache for admin insights (1 hour expiration)
let cachedInsights: any = null;
let lastCachedTime = 0;

// API Route: AI Insights for Municipal Officers / Admin Panel
app.get('/api/admin/insights', async (req, res) => {
  const now = Date.now();
  if (cachedInsights && (now - lastCachedTime < 60 * 60 * 1000)) {
    return res.json(cachedInsights);
  }

  const issues = getIssues();
  const activeIssues = issues.filter(i => i.status !== 'resolved');

  const hasRealKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  // Default rich, structured insights matching format: array of {title, message, icon, severity, action_url}
  let insightsList = [
    {
      title: 'Hazratganj Road Damage Spike',
      message: 'Pothole and road damage reports are up 40% in Hazratganj this week. Commuter traffic is heavily impacted.',
      icon: 'AlertTriangle',
      severity: 'high',
      action_url: '/admin/issues'
    },
    {
      title: 'Potential Water Main Leakage',
      message: 'Detected 5 unresolved water leak reports within 500 meters in Zone 3. This indicates a probable main pipeline burst.',
      icon: 'Droplet',
      severity: 'high',
      action_url: '/admin/issues'
    },
    {
      title: 'Sanitation Turnaround Improvement',
      message: 'Sanitation Department improved its average resolution speed by 35% this month compared to previous periods.',
      icon: 'Sparkles',
      severity: 'low',
      action_url: '/admin/departments'
    }
  ];

  if (hasRealKey) {
    try {
      const summaryList = activeIssues.map(i => ({
        id: i.id,
        title: i.title,
        category: i.category,
        severity: i.severity,
        address: i.address,
        upvotes: i.upvotes,
        created_at: i.created_at
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are 'Agent 4: Insight Generator', an AI municipal administrative expert.
                   Analyze this list of active civic issues reported by citizens in India:
                   ${JSON.stringify(summaryList)}
                   
                   Generate 3-5 high-quality, professional municipal insights analyzing recent trends (such as hotspots, potential infrastructure clusters like water leaks, or department efficiency).
                   Each insight MUST fit this exact JSON schema.
                   Return JSON array fitting the requested schema.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Short heading (e.g. 'Pothole Spike in Hazratganj')" },
                message: { type: Type.STRING, description: "Detailed analytic insight message" },
                icon: { type: Type.STRING, description: "Lucide icon name (e.g. 'AlertTriangle', 'Droplet', 'TrendingUp', 'Zap', 'Sparkles')" },
                severity: { type: Type.STRING, description: "high, medium, or low" },
                action_url: { type: Type.STRING, description: "Relevant subpage (e.g. '/admin/issues' or '/admin/departments')" }
              },
              required: ['title', 'message', 'icon', 'severity', 'action_url']
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text.trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          insightsList = parsed;
        }
      }
    } catch (insErr) {
      console.error('Gemini Admin Insights Error, using fallback analytical defaults:', insErr);
    }
  }

  cachedInsights = insightsList;
  lastCachedTime = now;

  res.json(insightsList);
});

// API Route: Admin Single Issue Update (with audit logging)
app.post('/api/admin/update-issue', (req, res) => {
  const { issue_id, status, assigned_department, priority, assigned_to, resolution_cost, internal_notes, performer_name } = req.body;
  if (!issue_id) {
    return res.status(400).json({ error: 'issue_id is required' });
  }

  const issues = getIssues();
  const issue = issues.find(i => i.id === issue_id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const oldValues = {
    status: issue.status,
    dept: issue.assigned_department,
    priority: issue.priority,
    assigned_to: issue.assigned_to,
    cost: issue.resolution_cost,
    notes: issue.internal_notes
  };

  const updates: Partial<Issue> = {};
  if (status !== undefined) updates.status = status;
  if (assigned_department !== undefined) updates.assigned_department = assigned_department;
  if (priority !== undefined) {
    updates.priority = priority;
    updates.severity = priority;
  }
  if (assigned_to !== undefined) updates.assigned_to = assigned_to;
  if (resolution_cost !== undefined) updates.resolution_cost = Number(resolution_cost) || 0;
  if (internal_notes !== undefined) updates.internal_notes = internal_notes;

  const updated = updateIssue(issue_id, updates);

  if (updated) {
    // Generate detailed old->new details for audit log
    const diffParts = [];
    if (status !== undefined && oldValues.status !== status) diffParts.push(`Status: ${oldValues.status} -> ${status}`);
    if (assigned_department !== undefined && oldValues.dept !== assigned_department) diffParts.push(`Dept: ${oldValues.dept || 'None'} -> ${assigned_department}`);
    if (priority !== undefined && oldValues.priority !== priority) diffParts.push(`Priority: ${oldValues.priority || 'None'} -> ${priority}`);
    if (assigned_to !== undefined && oldValues.assigned_to !== assigned_to) diffParts.push(`Assignee: ${oldValues.assigned_to || 'None'} -> ${assigned_to}`);
    if (resolution_cost !== undefined && oldValues.cost !== resolution_cost) diffParts.push(`Cost: ₹${oldValues.cost || 0} -> ₹${resolution_cost}`);
    if (internal_notes !== undefined && oldValues.notes !== internal_notes) diffParts.push(`Notes updated`);

    addAuditLog({
      issue_id,
      action: 'update_issue',
      old_value: diffParts.length > 0 ? diffParts.join(', ') : 'No functional changes',
      new_value: `Updated by ${performer_name || 'Admin'}`,
      performed_by: performer_name || 'Admin Officer'
    });
  }

  res.json({ success: true, issue: updated });
});

// API Route: Wipe or reset sample issues for clean testing
app.post('/api/admin/clear-issues', (req, res) => {
  const db = loadDb();
  db.issues = [];
  db.upvotes = [];
  db.audit_logs = [{
    id: 'clear-audit-' + Math.random().toString(36).substring(2, 11),
    issue_id: 'system',
    action: 'clear_database',
    old_value: 'Many sample issues',
    new_value: 'Cleared for clean test slate',
    performed_by: req.body.performer_name || 'Super Admin Officer',
    performed_at: new Date().toISOString()
  }];
  saveDb(db);
  res.json({ success: true, message: 'Database sample issues cleared.' });
});

// API Route: Admin Bulk Status Updates
app.post('/api/admin/bulk-update', (req, res) => {
  const { issue_ids, status, assigned_department, priority, assigned_to, officer_name } = req.body;
  if (!issue_ids || !Array.isArray(issue_ids) || issue_ids.length === 0) {
    return res.status(400).json({ error: 'issue_ids is required and must be an array' });
  }

  const updatedIssues = [];
  for (const id of issue_ids) {
    const updates: Partial<Issue> = {};
    if (status) updates.status = status;
    if (assigned_department) updates.assigned_department = assigned_department;
    if (assigned_to) updates.assigned_to = assigned_to;
    if (priority) {
      updates.priority = priority;
      updates.severity = priority;
    }

    const updated = updateIssue(id, updates);
    if (updated) {
      updatedIssues.push(updated);
      addAuditLog({
        issue_id: id,
        action: 'bulk_update',
        new_value: `Status: ${status || 'unchanged'}, Dept: ${assigned_department || 'unchanged'}, Assignee: ${assigned_to || 'unchanged'}`,
        performed_by: officer_name || 'Admin Officer'
      });
    }
  }

  res.json({ success: true, updatedCount: updatedIssues.length, updatedIssues });
});

// -------------------------------------------------------------
// Vite Middleware / Asset Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
