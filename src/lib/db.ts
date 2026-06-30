import fs from 'fs';
import path from 'path';
import { Issue, UserProfile, Upvote, AuditLog } from '../types';
import { getDepartmentAndSla } from './departmentRouter';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  issues: Issue[];
  profiles: UserProfile[];
  upvotes: Upvote[];
  audit_logs: AuditLog[];
}

function getInitialSchema(): Schema {
  const now = new Date();
  
  const initialIssues: Issue[] = [];

  const initialProfiles: UserProfile[] = [
    {
      user_id: 'profile-seed-1',
      firebase_uid: 'seed-hero-1',
      phone: '+919876543210',
      display_name: 'Aarav Sharma',
      points: 1250,
      level: 13,
      badges: ['First Reporter', 'Local Hero'],
      streak_days: 12,
      role: 'citizen',
      language: 'en',
      onboarded: true,
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'profile-seed-2',
      firebase_uid: 'seed-hero-2',
      phone: '+919876543211',
      display_name: 'Priya Patel',
      points: 620,
      level: 7,
      badges: ['First Reporter', 'Verifier'],
      streak_days: 5,
      role: 'citizen',
      language: 'hi',
      onboarded: true,
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'profile-seed-3',
      firebase_uid: 'seed-hero-3',
      phone: '+919876543212',
      display_name: 'Karthik Raja',
      points: 340,
      level: 4,
      badges: ['First Reporter'],
      streak_days: 2,
      role: 'citizen',
      language: 'ta',
      onboarded: true,
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'profile-seed-admin',
      firebase_uid: 'seed-admin',
      phone: '+919999999999',
      display_name: 'Super Admin Officer',
      points: 5000,
      level: 51,
      badges: ['Welcome Hero', 'Streak Master'],
      streak_days: 30,
      role: 'super_admin',
      department: 'Municipal Headquarters',
      zone_assigned: 'Zone 5 (Central)',
      language: 'en',
      onboarded: true,
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'profile-seed-ward',
      firebase_uid: 'seed-ward-officer',
      phone: '+918888888888',
      display_name: 'Ward Officer Kumar',
      points: 2500,
      level: 25,
      badges: ['Welcome Hero'],
      streak_days: 10,
      role: 'ward_officer',
      department: 'Public Works Department (PWD)',
      zone_assigned: 'Zone 3 (Hazratganj)',
      language: 'en',
      onboarded: true,
      created_at: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'profile-seed-dept',
      firebase_uid: 'seed-dept-head',
      phone: '+917777777777',
      display_name: 'Dept Head Shastri',
      points: 3500,
      level: 35,
      badges: ['Welcome Hero'],
      streak_days: 15,
      role: 'department_head',
      department: 'Sanitation Department',
      zone_assigned: 'Zone 1 (North)',
      language: 'en',
      onboarded: true,
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  return {
    issues: initialIssues,
    profiles: initialProfiles,
    upvotes: [],
    audit_logs: []
  };
}

export function loadDb(): Schema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialSchema();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as Schema;
  } catch (err) {
    console.error('Error loading db file, returning fallback data:', err);
    return getInitialSchema();
  }
}

export function saveDb(data: Schema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving to db file:', err);
  }
}

// Database helper functions
export function getIssues(): Issue[] {
  const db = loadDb();
  return db.issues;
}

export function addIssue(issue: Issue): void {
  const db = loadDb();
  db.issues.unshift(issue);
  saveDb(db);
}

export function updateIssue(issueId: string, updates: Partial<Issue>): Issue | null {
  const db = loadDb();
  const index = db.issues.findIndex(i => i.id === issueId);
  if (index === -1) return null;
  
  db.issues[index] = {
    ...db.issues[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  saveDb(db);
  return db.issues[index];
}

export function getProfile(firebaseUid: string): UserProfile | null {
  const db = loadDb();
  return db.profiles.find(p => p.firebase_uid === firebaseUid) || null;
}

export function getOrCreateProfile(firebaseUid: string, phone?: string, displayName?: string): UserProfile {
  const db = loadDb();
  let profile = db.profiles.find(p => p.firebase_uid === firebaseUid);
  
  if (!profile) {
    const now = new Date().toISOString();
    
    let role: UserProfile['role'] = 'citizen';
    let zone_assigned = undefined;
    let department = undefined;
    let pName = displayName || (phone ? `Hero ${phone.slice(-4)}` : 'Anonymous Hero');
    
    if (firebaseUid === 'seed-admin') {
      role = 'super_admin';
      zone_assigned = 'Zone 5 (Central)';
      department = 'Municipal Headquarters';
      pName = 'Super Admin Officer';
    } else if (firebaseUid === 'seed-ward-officer') {
      role = 'ward_officer';
      zone_assigned = 'Zone 3 (Hazratganj)';
      department = 'Public Works Department (PWD)';
      pName = 'Ward Officer Kumar';
    } else if (firebaseUid === 'seed-dept-head') {
      role = 'department_head';
      zone_assigned = 'Zone 1 (North)';
      department = 'Sanitation Department';
      pName = 'Dept Head Shastri';
    }

    profile = {
      user_id: 'profile-' + Math.random().toString(36).substring(2, 11),
      firebase_uid: firebaseUid,
      phone: phone || '',
      display_name: pName,
      points: 10, // 10 points welcome bonus!
      level: 1,
      badges: ['Welcome Hero'], // Welcome Hero badge auto awarded
      streak_days: 1,
      last_active_date: new Date().toISOString().split('T')[0],
      role,
      zone_assigned,
      department,
      language: 'en',
      onboarded: true,
      created_at: now
    };
    db.profiles.push(profile);
    saveDb(db);
  } else {
    // Check streak
    const todayStr = new Date().toISOString().split('T')[0];
    if (profile.last_active_date !== todayStr) {
      const lastActive = profile.last_active_date ? new Date(profile.last_active_date) : null;
      const today = new Date(todayStr);
      if (lastActive) {
        const diffTime = Math.abs(today.getTime() - lastActive.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          profile.streak_days = (profile.streak_days || 0) + 1;
          // Award badge if streak master
          if (profile.streak_days >= 7 && !profile.badges.includes('Streak Master')) {
            profile.badges.push('Streak Master');
            profile.points += 50; // Bonus
          }
        } else if (diffDays > 1) {
          profile.streak_days = 1; // Reset
        }
      }
      profile.last_active_date = todayStr;
      saveDb(db);
    }
  }
  
  return profile;
}

export function awardPoints(firebaseUid: string, amount: number): UserProfile | null {
  const db = loadDb();
  const index = db.profiles.findIndex(p => p.firebase_uid === firebaseUid);
  if (index === -1) return null;
  
  const profile = db.profiles[index];
  profile.points += amount;
  
  // Calculate level mathematically: +1 level per 100 points, starting at level 1
  profile.level = Math.floor(profile.points / 100) + 1;
  
  db.profiles[index] = profile;
  saveDb(db);
  return profile;
}

export function awardBadge(firebaseUid: string, badgeName: string): UserProfile | null {
  const db = loadDb();
  const index = db.profiles.findIndex(p => p.firebase_uid === firebaseUid);
  if (index === -1) return null;
  
  const profile = db.profiles[index];
  if (!profile.badges.includes(badgeName)) {
    profile.badges.push(badgeName);
    profile.points += 20; // 20 bonus points for earning badge
    db.profiles[index] = profile;
    saveDb(db);
    return profile;
  }
  return profile;
}

export function upvoteIssue(issueId: string, firebaseUid: string): { success: boolean; issue: Issue | null; profile: UserProfile | null } {
  const db = loadDb();
  
  // Check if upvote already exists
  const existingUpvote = db.upvotes.find(u => u.issue_id === issueId && u.firebase_uid === firebaseUid);
  if (existingUpvote) {
    return { success: false, issue: null, profile: null };
  }
  
  // Create upvote
  const newUpvote: Upvote = {
    id: 'up-' + Math.random().toString(36).substring(2, 11),
    issue_id: issueId,
    firebase_uid: firebaseUid,
    created_at: new Date().toISOString()
  };
  db.upvotes.push(newUpvote);
  
  // Update issue upvotes count
  const issueIndex = db.issues.findIndex(i => i.id === issueId);
  if (issueIndex === -1) return { success: false, issue: null, profile: null };
  db.issues[issueIndex].upvotes += 1;
  db.issues[issueIndex].updated_at = new Date().toISOString();
  
  const updatedIssue = db.issues[issueIndex];
  
  // Award 5 points to the user upvoting
  const updatedProfile = awardPoints(firebaseUid, 5);
  
  // Check if they earned "Verifier" badge (10 upvotes given)
  if (updatedProfile) {
    const userUpvotesCount = db.upvotes.filter(u => u.firebase_uid === firebaseUid).length;
    if (userUpvotesCount >= 10 && !updatedProfile.badges.includes('Verifier')) {
      awardBadge(firebaseUid, 'Verifier');
    }
  }
  
  saveDb(db);
  return { success: true, issue: updatedIssue, profile: updatedProfile };
}

export function getLeaderboard(): UserProfile[] {
  const db = loadDb();
  return [...db.profiles]
    .sort((a, b) => b.points - a.points)
    .slice(0, 20);
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'performed_at'>): void {
  const db = loadDb();
  const newLog: AuditLog = {
    ...log,
    id: 'audit-' + Math.random().toString(36).substring(2, 11),
    performed_at: new Date().toISOString()
  };
  db.audit_logs.unshift(newLog);
  saveDb(db);
}

export function getAuditLogs(): AuditLog[] {
  const db = loadDb();
  return db.audit_logs.slice(0, 50);
}
