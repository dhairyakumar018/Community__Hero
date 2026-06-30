import { Issue, UserProfile } from '../types';

export async function fetchApi<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API Error: ${res.status}`);
  }
  
  return res.json() as Promise<T>;
}

// Session management
const GUEST_UID_KEY = 'community_hero_firebase_uid';
const USER_PROFILE_KEY = 'community_hero_user_profile';

export function getSessionUid(): string | null {
  return localStorage.getItem(GUEST_UID_KEY);
}

export function setSessionUid(uid: string) {
  localStorage.setItem(GUEST_UID_KEY, uid);
}

export function getCachedProfile(): UserProfile | null {
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedProfile(profile: UserProfile | null) {
  if (profile) {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(GUEST_UID_KEY);
  }
}

export async function loginAsGuest(phone: string, displayName?: string): Promise<UserProfile> {
  // Generate a guest UID linked to the phone
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const uid = 'guest-' + btoa(cleanPhone).replace(/=/g, '').toLowerCase().slice(0, 15);
  
  const profile = await fetchApi<UserProfile>('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify({
      firebase_uid: uid,
      phone: cleanPhone,
      display_name: displayName || `Hero ${cleanPhone.slice(-4)}`
    })
  });
  
  setSessionUid(uid);
  setCachedProfile(profile);
  return profile;
}

export async function loginAsAdmin(): Promise<UserProfile> {
  return loginAsOfficer('super_admin');
}

export async function loginAsOfficer(role: 'super_admin' | 'ward_officer' | 'department_head'): Promise<UserProfile> {
  let uid = 'seed-admin';
  let phone = '+919999999999';
  let name = 'Super Admin Officer';

  if (role === 'ward_officer') {
    uid = 'seed-ward-officer';
    phone = '+918888888888';
    name = 'Ward Officer Kumar';
  } else if (role === 'department_head') {
    uid = 'seed-dept-head';
    phone = '+917777777777';
    name = 'Dept Head Shastri';
  }

  const profile = await fetchApi<UserProfile>('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify({
      firebase_uid: uid,
      phone,
      display_name: name
    })
  });
  
  setSessionUid(uid);
  setCachedProfile(profile);
  return profile;
}
