'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  ProfileFieldShell,
  ProfileInfoTile,
  ProfileNotice,
  ProfilePageShell,
  ProfilePrimaryButton,
  ProfileSurface,
  profileControlClassName,
} from '@/components/profile/ProfilePageShell';
import { useInvestApp } from '@/lib/investapp-context';
import {
  fetchCurrentUserProfile,
  patchCurrentUserProfile,
} from '@/utils/client/current-user-profile';

type SocialForm = {
  facebook: string;
  instagram: string;
  x: string;
  tiktok: string;
  linkedin: string;
  youtube: string;
  website: string;
};

const emptyForm: SocialForm = {
  facebook: '',
  instagram: '',
  x: '',
  tiktok: '',
  linkedin: '',
  youtube: '',
  website: '',
};

const getStatusTone = (message: string) => {
  if (/could not|error/i.test(message)) return 'danger' as const;
  if (/updated|success/i.test(message)) return 'success' as const;
  return 'neutral' as const;
};

function IconUsers() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 18.5V20" />
      <circle cx="12" cy="9" r="3" />
      <path d="M19 20v-1a2.8 2.8 0 0 0-2.3-2.8" />
      <path d="M5 20v-1A2.8 2.8 0 0 1 7.3 16.2" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3c2 1.4 4.1 2.4 6.7 3a1.2 1.2 0 0 1 .9 1.2c-.3 5.7-2.4 10.8-7.6 12.8-5.2-2-7.3-7.1-7.6-12.8A1.2 1.2 0 0 1 5.3 6C7.9 5.4 10 4.4 12 3Z" />
      <path d="m9.4 12.3 1.8 1.8 3.8-4" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="7" width="16" height="11" rx="3" />
      <path d="M9 7 10.2 5.5h3.6L15 7" />
      <circle cx="12" cy="12.5" r="2.8" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 17H8.5Z" />
      <path d="M8 9.5h8" />
      <path d="M8 12.5h6" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="m10 9 5 3-5 3Z" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5Z" />
      <path d="M9 6V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1" />
      <path d="M4 11h16" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}

const FIELD_CONFIG: Array<{
  key: keyof SocialForm;
  label: string;
  placeholder: string;
  icon: ReactNode;
}> = [
  { key: 'facebook', label: 'Facebook', placeholder: 'Facebook URL', icon: <IconUsers /> },
  { key: 'instagram', label: 'Instagram', placeholder: 'Instagram handle', icon: <IconCamera /> },
  { key: 'x', label: 'X (Twitter)', placeholder: 'X handle', icon: <IconMessage /> },
  { key: 'tiktok', label: 'TikTok', placeholder: 'TikTok handle', icon: <IconPlay /> },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'LinkedIn URL', icon: <IconBriefcase /> },
  { key: 'youtube', label: 'YouTube', placeholder: 'YouTube channel', icon: <IconPlay /> },
  { key: 'website', label: 'Website', placeholder: 'https://', icon: <IconGlobe /> },
];

export default function SocialMediaPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [form, setForm] = useState<SocialForm>(emptyForm);
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [availableColumns, setAvailableColumns] = useState<Set<string>>(new Set());
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const connectedProfiles = Object.values(form).filter((value) => value.trim()).length;

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      setStatus('');

      const { data, error } = await fetchCurrentUserProfile<Record<string, unknown> | null>(
        getAccessToken
      );

      if (error) {
        setStatus('Could not load your profile from Supabase.');
      }

      const cols = new Set<string>(Object.keys(data ?? {}));
      setAvailableColumns(cols);

      const rawProfileData = data?.profile_data ?? data?.metadata ?? null;
      let parsedProfileData: Record<string, unknown> = {};

      if (rawProfileData && typeof rawProfileData === 'string') {
        try {
          parsedProfileData = JSON.parse(rawProfileData) as Record<string, unknown>;
        } catch {
          parsedProfileData = {};
        }
      } else if (rawProfileData && typeof rawProfileData === 'object') {
        parsedProfileData = rawProfileData as Record<string, unknown>;
      }

      setProfileData(parsedProfileData);
      const social = (parsedProfileData.social_media as Record<string, string> | undefined) ?? {};

      setForm({
        facebook: (data?.social_facebook as string | null) ?? social.facebook ?? '',
        instagram: (data?.social_instagram as string | null) ?? social.instagram ?? '',
        x: (data?.social_x as string | null) ?? social.x ?? '',
        tiktok: (data?.social_tiktok as string | null) ?? social.tiktok ?? '',
        linkedin: (data?.social_linkedin as string | null) ?? social.linkedin ?? '',
        youtube: (data?.social_youtube as string | null) ?? social.youtube ?? '',
        website: (data?.social_website as string | null) ?? social.website ?? '',
      });
      setLoadingProfile(false);
    };

    void loadProfile();
  }, [getAccessToken, user?.id]);

  const updateForm = (key: keyof SocialForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveSocialMedia = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatus('');

    try {
      const payload: Record<string, unknown> = {
        id: user.id,
      };

      if (availableColumns.has('social_facebook')) payload.social_facebook = form.facebook || null;
      if (availableColumns.has('social_instagram')) payload.social_instagram = form.instagram || null;
      if (availableColumns.has('social_x')) payload.social_x = form.x || null;
      if (availableColumns.has('social_tiktok')) payload.social_tiktok = form.tiktok || null;
      if (availableColumns.has('social_linkedin')) payload.social_linkedin = form.linkedin || null;
      if (availableColumns.has('social_youtube')) payload.social_youtube = form.youtube || null;
      if (availableColumns.has('social_website')) payload.social_website = form.website || null;

      const socialPayload = {
        facebook: form.facebook || null,
        instagram: form.instagram || null,
        x: form.x || null,
        tiktok: form.tiktok || null,
        linkedin: form.linkedin || null,
        youtube: form.youtube || null,
        website: form.website || null,
      };

      if (availableColumns.has('profile_data')) {
        payload.profile_data = { ...profileData, social_media: socialPayload };
      }
      if (availableColumns.has('metadata')) {
        payload.metadata = { ...profileData, social_media: socialPayload };
      }

      const { error } = await patchCurrentUserProfile(getAccessToken, payload);
      if (error) {
        setStatus(`Could not save to Supabase: ${error}`);
        return;
      }

      setStatus('Social media updated successfully.');
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unknown error while saving social media.';
      console.error('Unexpected error saving social media:', caughtError);
      setStatus(`Social media updated, but the screen could not finish refreshing: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfilePageShell
      title="Social Media"
      subtitle="Show the public channels that validate your profile."
      footer={
        <>
          {status ? <ProfileNotice tone={getStatusTone(status)}>{status}</ProfileNotice> : null}
          <ProfileSurface className="p-3">
            <ProfilePrimaryButton onClick={saveSocialMedia} disabled={saving || loadingProfile}>
              {saving ? 'Saving...' : 'Save social media'}
            </ProfilePrimaryButton>
          </ProfileSurface>
        </>
      }
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Social profiles
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Keep your public presence up to date
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Add the channels that help investors, founders and partners verify your identity and credibility across the web.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ProfileInfoTile
              icon={<IconUsers />}
              eyebrow="Connected"
              title={`${connectedProfiles} profile${connectedProfiles === 1 ? '' : 's'} linked`}
              description="Active public channels connected to your account."
              tone="purple"
            />
            <ProfileInfoTile
              icon={<IconShield />}
              eyebrow="Visibility"
              title="Public trust signals ready"
              description="Prioritize LinkedIn, website and one active social network."
              tone="green"
            />
          </div>
        </div>
      </ProfileSurface>

      {loadingProfile ? (
        <ProfileNotice>Loading your social media settings...</ProfileNotice>
      ) : null}

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Public channels
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Channels visible from your profile
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {FIELD_CONFIG.map((field) => (
              <ProfileFieldShell key={field.key} label={field.label} icon={field.icon}>
                <input
                  value={form[field.key]}
                  onChange={(event) => updateForm(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className={profileControlClassName}
                />
              </ProfileFieldShell>
            ))}
          </div>
        </div>
      </ProfileSurface>
    </ProfilePageShell>
  );
}
