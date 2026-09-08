"use server";

import { revalidatePath } from "next/cache";

import { emptyGuidanceState } from "@/features/guidance/model";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UnitSystem } from "@/lib/units";

export type ProfileActionState = {
  fieldErrors?: {
    currentPassword?: string;
    displayName?: string;
    newPassword?: string;
    timeZone?: string;
    unitSystem?: string;
  };
  message?: string;
  success?: boolean;
};

export async function updateProfile(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const unitSystem = String(formData.get("unitSystem") ?? "") as UnitSystem;
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  const fieldErrors: NonNullable<ProfileActionState["fieldErrors"]> = {};

  if (displayName.length < 2 || displayName.length > 80) {
    fieldErrors.displayName = "Use between 2 and 80 characters.";
  }
  if (unitSystem !== "metric" && unitSystem !== "imperial") {
    fieldErrors.unitSystem = "Choose kilograms or pounds.";
  }
  if (!isTimeZone(timeZone)) {
    fieldErrors.timeZone = "Choose a valid time zone.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      time_zone: timeZone,
      unit_system: unitSystem,
    })
    .eq("id", user.id);

  if (error) return { message: "Your profile could not be saved." };

  revalidatePath("/", "layout");
  return { message: "Profile settings saved.", success: true };
}

export async function resetGuidance(
  previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  void previousState;
  void formData;
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { message: "Guidance could not be reset." };

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...data.user.user_metadata,
      overmastery_guidance: emptyGuidanceState,
    },
  });
  if (updateError) return { message: "Guidance could not be reset." };

  revalidatePath("/", "layout");
  return {
    message: "Guidance reset. Tips will appear again at the relevant steps.",
    success: true,
  };
}

export async function changePassword(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const fieldErrors: NonNullable<ProfileActionState["fieldErrors"]> = {};

  if (!currentPassword) fieldErrors.currentPassword = "Enter your current password.";
  if (newPassword.length < 8) fieldErrors.newPassword = "Use at least 8 characters.";
  if (currentPassword && currentPassword === newPassword) {
    fieldErrors.newPassword = "Choose a different password.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    current_password: currentPassword,
    password: newPassword,
  });

  if (error) {
    return { message: "The password could not be changed. Check your current password." };
  }
  return { message: "Password changed.", success: true };
}

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}
