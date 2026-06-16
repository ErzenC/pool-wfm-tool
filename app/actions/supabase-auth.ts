"use server";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/server";

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  return createClient(supabaseUrl, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createWorkerAuthAccount(input: {
  employeeCode: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
}) {
  const supabase = createSupabaseAdminClient();
  const username = input.employeeCode;
  const email = `${input.employeeCode}@poolwfm.local`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      username,
      employee_code: input.employeeCode,
      first_name: input.firstName,
      last_name: input.lastName,
      must_change_password: true,
    },
  });

  if (error) {
    throw error;
  }

  return {
    authUserId: data.user.id,
    username,
  };
}

export async function mapUsernameToAuthEmail(username: string) {
  if (username.includes("@")) {
    return username;
  }

  return `${username}@poolwfm.local`;
}
