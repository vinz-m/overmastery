"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emptyGuidanceState } from "@/features/guidance/model";
import { requireUserId } from "@/lib/auth/session";
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
  const userId = await requireUserId();
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
    .eq("id", userId);

  if (error) return { message: "Your profile could not be saved." };

  // "UTC" is also the signup default that the device sync replaces, so record
  // that this one was chosen on purpose. Other zones never get replaced.
  if (timeZone === "UTC") await markTimeZoneChosen(supabase);

  revalidatePath("/", "layout");
  return { message: "Profile settings saved.", success: true };
}

// Profiles are created with the "UTC" default because signup runs before the
// app knows the device's zone. Adopt the device zone once, and only while the
// profile still holds that default, so an explicit choice is never overwritten.
// Returns false when the user deliberately chose UTC, so the client stops asking.
export async function adoptDeviceTimeZone(timeZone: string) {
  const userId = await requireUserId();
  if (!isTimeZone(timeZone) || timeZone === "UTC") return true;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.user_metadata?.[timeZoneChosenKey] === true) return false;

  const { data } = await supabase
    .from("profiles")
    .update({ time_zone: timeZone })
    .eq("id", userId)
    .eq("time_zone", "UTC")
    .select("id");

  if (data?.length) revalidatePath("/", "layout");
  return true;
}

const timeZoneChosenKey = "overmastery_time_zone_chosen";

async function markTimeZoneChosen(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return;
  await supabase.auth.updateUser({
    data: { ...data.user.user_metadata, [timeZoneChosenKey]: true },
  });
}

export async function resetGuidance(
  previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  void previousState;
  void formData;
  await requireUserId();
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
  redirect("/");
}

export async function changePassword(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  await requireUserId();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const fieldErrors: NonNullable<ProfileActionState["fieldErrors"]> = {};

  if (!currentPassword)
    fieldErrors.currentPassword = "Enter your current password.";
  if (newPassword.length < 8)
    fieldErrors.newPassword = "Use at least 8 characters.";
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
    return {
      message:
        "The password could not be changed. Check your current password.",
    };
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
