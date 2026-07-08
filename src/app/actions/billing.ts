"use server";

// Billing server actions (docs/REQUIREMENTS §5). Statement formation is
// idempotent, so this "catch up" is safe to run whenever the user opens the
// calendar.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { formDueStatements } from "@/lib/billing";

export async function closeDueStatementsAction(): Promise<void> {
  const user = await requireUser();
  await formDueStatements(user.id);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
