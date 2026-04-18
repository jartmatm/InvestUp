'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
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

type FieldProps = {
  label: string;
  children: ReactNode;
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

function Field({ label, children }: FieldProps) {
  return (
    <div className="px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

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

    loadProfile();
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
    <PageFrame
      title="Social Media"
      subtitle="Show the public channels that validate your profile"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(145deg,rgba(107,57,244,0.16),rgba(255,255,255,0.86),rgba(76,110,245,0.12))] px-5 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
                Social profiles
              </p>
              <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
                Keep your public presence up to date
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                Add the channels that help investors, founders, and partners verify your identity
                and credibility across the web.
              </p>
            </div>

            <div className="grid gap-3 sm:min-w-[220px]">
              <div className="rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Connected
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {connectedProfiles} profile{connectedProfiles === 1 ? '' : 's'} linked
                </p>
              </div>
              <div className="rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Visibility
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  Public trust signals ready
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Best practice
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Use public URLs or handles that are actively maintained so counterparties can verify
              your identity faster.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Recommended
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Prioritize LinkedIn, website, and one active social network to strengthen your
              profile without overwhelming the page.
            </p>
          </div>
        </div>

        {loadingProfile ? <p className="text-sm text-slate-500">Loading profile...</p> : null}

        <div className="rounded-[28px] border border-white/30 bg-white/20 shadow-[0_14px_34px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <div className="border-b border-white/20 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Public channels
            </p>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              Channels visible from your profile
            </h3>
          </div>

          <div className="divide-y divide-white/20 overflow-hidden">
            <Field label="Facebook">
              <Input
                value={form.facebook}
                onChange={(value) => updateForm('facebook', value)}
                placeholder="Facebook URL"
              />
            </Field>
            <Field label="Instagram">
              <Input
                value={form.instagram}
                onChange={(value) => updateForm('instagram', value)}
                placeholder="Instagram handle"
              />
            </Field>
            <Field label="X (Twitter)">
              <Input
                value={form.x}
                onChange={(value) => updateForm('x', value)}
                placeholder="X handle"
              />
            </Field>
            <Field label="TikTok">
              <Input
                value={form.tiktok}
                onChange={(value) => updateForm('tiktok', value)}
                placeholder="TikTok handle"
              />
            </Field>
            <Field label="LinkedIn">
              <Input
                value={form.linkedin}
                onChange={(value) => updateForm('linkedin', value)}
                placeholder="LinkedIn URL"
              />
            </Field>
            <Field label="YouTube">
              <Input
                value={form.youtube}
                onChange={(value) => updateForm('youtube', value)}
                placeholder="YouTube channel"
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(value) => updateForm('website', value)}
                placeholder="https://"
              />
            </Field>
          </div>
        </div>

        <Button
          onClick={saveSocialMedia}
          disabled={saving || loadingProfile}
          className="rounded-xl py-4 text-base !bg-[#6B39F4] !text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] hover:!bg-[#5B31CF]"
        >
          {saving ? 'Saving...' : 'Save social media'}
        </Button>

        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </div>
    </PageFrame>
  );
}
