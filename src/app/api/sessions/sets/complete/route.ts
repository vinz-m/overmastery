import { saveCompletedSet } from "@/features/sessions/complete-set";
import type { CompleteSetInput } from "@/features/sessions/types";

export async function POST(request: Request) {
  let input: CompleteSetInput;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { message: "Enter a valid set.", ok: false },
      { status: 400 },
    );
  }
  return Response.json(await saveCompletedSet(input));
}
