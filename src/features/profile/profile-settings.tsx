"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import {
  ArrowRightIcon,
  DesktopIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";

import { signOut } from "@/features/auth/actions";
import {
  useTheme,
  type ThemePreference,
} from "@/features/theme/theme-provider";
import { SelectField, type SelectOption } from "@/features/ui/select-field";
import { ContextualTip } from "@/features/guidance/contextual-tip";
import { hasSeenGuidance, type GuidanceState } from "@/features/guidance/model";
import type { UnitSystem } from "@/lib/units";

import {
  changePassword,
  resetGuidance,
  updateProfile,
  type ProfileActionState,
} from "./actions";
import styles from "./profile.module.css";

const initialState: ProfileActionState = {};
const unitOptions = [
  { label: "Kilograms (kg)", value: "metric" },
  { label: "Pounds (lb)", value: "imperial" },
];

export function ProfileSettings({
  createdAt,
  displayName,
  email,
  guidance,
  timeZone,
  timeZoneOptions,
  unitSystem,
}: {
  createdAt?: string;
  displayName: string;
  email: string;
  guidance: GuidanceState;
  timeZone: string;
  timeZoneOptions: SelectOption[];
  unitSystem: UnitSystem;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfile,
    initialState,
  );
  const [guidanceState, guidanceAction, guidancePending] = useActionState(
    resetGuidance,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <main className={styles.tabContent}>
      <section className={styles.lead}>
        <p>Profile</p>
        <h1>Profile</h1>
        <span>Manage your training preferences and account.</span>
      </section>

      {!hasSeenGuidance(guidance, "profile.overview.v1") && (
        <ContextualTip
          body="Set your theme, units, and time zone here. You can restart these tips whenever you need a refresher."
          guidanceKey="profile.overview.v1"
          title="Make the app yours"
        />
      )}

      <section className={styles.identity}>
        <div>
          <span>Signed in as</span>
          <strong>{email}</strong>
        </div>
        {createdAt && <small>Member since {formatMemberDate(createdAt)}</small>}
      </section>

      <ThemeSettings />

      <section className={styles.settingsSection}>
        <header>
          <span>Training</span>
          <h2>Preferences</h2>
        </header>
        <form action={profileAction}>
          <Field
            error={profileState.fieldErrors?.displayName}
            label="Display name"
          >
            <input
              autoComplete="name"
              defaultValue={displayName}
              maxLength={80}
              name="displayName"
              required
            />
          </Field>
          <div className={styles.field}>
            <span>Weight display</span>
            <SelectField
              ariaLabel="Weight display"
              defaultValue={unitSystem}
              name="unitSystem"
              options={unitOptions}
            />
            {profileState.fieldErrors?.unitSystem && (
              <small role="alert">{profileState.fieldErrors.unitSystem}</small>
            )}
          </div>
          <div className={styles.field}>
            <span>Time zone</span>
            <SelectField
              ariaLabel="Time zone"
              defaultValue={timeZone}
              name="timeZone"
              options={timeZoneOptions}
              searchable
              searchPlaceholder="Search city, region or GMT+8"
            />
            {profileState.fieldErrors?.timeZone && (
              <small role="alert">{profileState.fieldErrors.timeZone}</small>
            )}
          </div>
          <p className={styles.help}>
            Choose the units you prefer. Your previous sessions will use them
            too.
          </p>
          <ActionMessage state={profileState} />
          <button disabled={profilePending} type="submit">
            {profilePending ? "Saving…" : "Save settings"}
            <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
          </button>
        </form>
      </section>

      <section className={styles.settingsSection}>
        <header>
          <span>Guidance</span>
          <h2>Contextual tips</h2>
        </header>
        <form action={guidanceAction}>
          <p className={styles.help}>
            Show dismissed onboarding tips again when you reach their relevant
            screen.
          </p>
          <ActionMessage state={guidanceState} />
          <button
            className={styles.secondaryButton}
            disabled={guidancePending}
            type="submit"
          >
            {guidancePending ? "Resetting…" : "Restart guidance"}
          </button>
        </form>
      </section>

      <section className={styles.settingsSection}>
        <header>
          <span>Security</span>
          <h2>Change password</h2>
        </header>
        <form action={passwordAction}>
          <Field
            error={passwordState.fieldErrors?.currentPassword}
            label="Current password"
          >
            <input
              autoComplete="current-password"
              name="currentPassword"
              type="password"
              required
            />
          </Field>
          <Field
            error={passwordState.fieldErrors?.newPassword}
            label="New password"
          >
            <input
              autoComplete="new-password"
              minLength={8}
              name="newPassword"
              type="password"
              required
            />
          </Field>
          <p className={styles.help}>
            Because you are already signed in, this change verifies your current
            password and does not send email.
          </p>
          <ActionMessage state={passwordState} />
          <button
            className={styles.secondaryButton}
            disabled={passwordPending}
            type="submit"
          >
            {passwordPending ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>

      <section className={styles.signOutSection}>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}

const themes: Array<{
  description: string;
  icon: "moon" | "sun" | "system";
  label: string;
  value: ThemePreference;
}> = [
  { description: "Always bright", icon: "sun", label: "Light", value: "light" },
  {
    description: "Match this device",
    icon: "system",
    label: "System",
    value: "system",
  },
  {
    description: "Easy on the eyes",
    icon: "moon",
    label: "Dark",
    value: "dark",
  },
];

function ThemeSettings() {
  const { preference, setPreference } = useTheme();

  return (
    <section className={styles.settingsSection}>
      <header>
        <span>Appearance</span>
        <h2>Theme</h2>
      </header>
      <div className={styles.themeCard}>
        <fieldset className={styles.themeOptions}>
          <legend className={styles.visuallyHidden}>Choose an app theme</legend>
          {themes.map((theme) => {
            const selected = preference === theme.value;
            return (
              <label className={styles.themeOption} key={theme.value}>
                <input
                  checked={selected}
                  name="theme"
                  onChange={() => setPreference(theme.value)}
                  type="radio"
                  value={theme.value}
                />
                {selected && (
                  <motion.span
                    className={styles.themeSelection}
                    layoutId="profile-theme-selection"
                    transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                )}
                <span className={styles.themeIcon} aria-hidden="true">
                  <ThemeIcon type={theme.icon} />
                </span>
                <strong>{theme.label}</strong>
                <small>{theme.description}</small>
              </label>
            );
          })}
        </fieldset>
        <p className={styles.help}>
          This preference is saved on this device and applies immediately.
        </p>
      </div>
    </section>
  );
}

function ThemeIcon({ type }: { type: "moon" | "sun" | "system" }) {
  if (type === "moon") {
    return <MoonIcon size={22} weight="regular" />;
  }
  if (type === "system") {
    return <DesktopIcon size={22} weight="regular" />;
  }
  return <SunIcon size={22} weight="regular" />;
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

function ActionMessage({ state }: { state: ProfileActionState }) {
  return state.message ? (
    <p
      className={state.success ? styles.success : styles.error}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  ) : null;
}

function formatMemberDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
