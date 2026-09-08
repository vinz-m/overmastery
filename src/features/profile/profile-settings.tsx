"use client";

import { useActionState } from "react";

import { signOut } from "@/features/auth/actions";
import { PrimaryNav } from "@/features/navigation/primary-nav";
import type { UnitSystem } from "@/lib/units";

import {
  changePassword,
  resetGuidance,
  updateProfile,
  type ProfileActionState,
} from "./actions";
import { AppHeader } from "@/features/navigation/app-header";

import styles from "./profile.module.css";

const initialState: ProfileActionState = {};

export function ProfileSettings({
  dayEndsAt,
  activeSessionId,
  createdAt,
  displayName,
  email,
  timeZone,
  timeZones,
  unitSystem,
}: {
  dayEndsAt: string;
  activeSessionId?: string;
  createdAt?: string;
  displayName: string;
  email: string;
  timeZone: string;
  timeZones: string[];
  unitSystem: UnitSystem;
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [guidanceState, guidanceAction, guidancePending] = useActionState(resetGuidance, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <AppHeader accountLabel={displayName} />

        <section className={styles.lead}>
          <p>Profile</p>
          <h1>Just the way you like it.</h1>
          <span>Your details, preferences, and account settings, all in one place.</span>
        </section>

        <section className={styles.identity}>
          <div><span>Signed in as</span><strong>{email}</strong></div>
          {createdAt && <small>Member since {formatMemberDate(createdAt)}</small>}
        </section>

        <section className={styles.settingsSection}>
          <header><span>Profile & training</span><h2>Your defaults</h2></header>
          <form action={profileAction}>
            <Field error={profileState.fieldErrors?.displayName} label="Display name">
              <input autoComplete="name" defaultValue={displayName} maxLength={80} name="displayName" required />
            </Field>
            <Field error={profileState.fieldErrors?.unitSystem} label="Weight display">
              <select defaultValue={unitSystem} name="unitSystem">
                <option value="metric">Kilograms (kg)</option>
                <option value="imperial">Pounds (lb)</option>
              </select>
            </Field>
            <Field error={profileState.fieldErrors?.timeZone} label="Time zone">
              <input defaultValue={timeZone} list="time-zones" name="timeZone" required />
              <datalist id="time-zones">
                {timeZones.map((zone) => <option key={zone} value={zone} />)}
              </datalist>
            </Field>
            <p className={styles.help}>Choose the units you prefer. Your previous sessions will use them too.</p>
            <ActionMessage state={profileState} />
            <button disabled={profilePending} type="submit">{profilePending ? "Saving…" : "Save settings"}<span>→</span></button>
          </form>
        </section>

        <section className={styles.settingsSection}>
          <header><span>Guidance</span><h2>Contextual tips</h2></header>
          <form action={guidanceAction}>
            <p className={styles.help}>Show dismissed onboarding tips again when you reach their relevant screen.</p>
            <ActionMessage state={guidanceState} />
            <button className={styles.secondaryButton} disabled={guidancePending} type="submit">{guidancePending ? "Resetting…" : "Restart guidance"}</button>
          </form>
        </section>

        <section className={styles.settingsSection}>
          <header><span>Security</span><h2>Change password</h2></header>
          <form action={passwordAction}>
            <Field error={passwordState.fieldErrors?.currentPassword} label="Current password">
              <input autoComplete="current-password" name="currentPassword" type="password" required />
            </Field>
            <Field error={passwordState.fieldErrors?.newPassword} label="New password">
              <input autoComplete="new-password" minLength={8} name="newPassword" type="password" required />
            </Field>
            <p className={styles.help}>Because you are already signed in, this change verifies your current password and does not send email.</p>
            <ActionMessage state={passwordState} />
            <button className={styles.secondaryButton} disabled={passwordPending} type="submit">{passwordPending ? "Changing…" : "Change password"}</button>
          </form>
        </section>

        <section className={styles.signOutSection}>
          <form action={signOut}><button type="submit">Sign out</button></form>
        </section>

        <PrimaryNav active="profile" activeSessionId={activeSessionId} dayEndsAt={dayEndsAt} />
      </section>
    </main>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return <label className={styles.field}><span>{label}</span>{children}{error && <small role="alert">{error}</small>}</label>;
}

function ActionMessage({ state }: { state: ProfileActionState }) {
  return state.message ? <p className={state.success ? styles.success : styles.error} role={state.success ? "status" : "alert"}>{state.message}</p> : null;
}

function formatMemberDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(value));
}
