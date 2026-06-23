import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestBodyWithUser = {
  userId?: string;
};

export async function getTrustedSessionUserId(body?: RequestBodyWithUser) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    if (data.user?.id) {
      return data.user.id;
    }
  } catch {
    // The current MVP still supports mock/local accounts until Supabase Auth is fully wired.
  }

  return body?.userId ?? null;
}

export async function signOutLocalSupabaseSession() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Missing Supabase env/session should not prevent local activity cookie cleanup.
  }
}
