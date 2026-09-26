"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ensureDefaultCollection, getPlayerEntryPath } from "./queries";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function signInWithEmail(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const returnTo = formData.get("returnTo")?.toString() || "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || "Invalid credentials." };
  }

  // Safe redirect URL validation
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : await getPlayerEntryPath();
  revalidatePath("/", "layout");
  redirect(safeReturn);
}

export async function signUpWithEmail(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const displayName = formData.get("displayName")?.toString().trim() || "";
  const returnTo = formData.get("returnTo")?.toString() || "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split("@")[0],
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If session is immediately active (email confirmation disabled or auto-confirmed)
  if (data.session) {
    const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/onboarding";
    revalidatePath("/", "layout");
    redirect(safeReturn);
  }

  return {
    success: true,
    message: "Registration successful. Please check your email for a confirmation link if required, then sign in.",
  };
}

export async function completeOnboardingAction(formData: FormData) {
  const displayName = formData.get("displayName")?.toString().trim();
  if (!displayName || displayName.length < 2) {
    return { error: "Choose a name with at least two characters." };
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: "Your session expired. Please sign in again." };
  }

  const { error } = await supabase.rpc("complete_player_onboarding", {
    p_display_name: displayName,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/game");
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}

export async function createDiaryEntryAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Your session expired. Please sign in again." };

  const title = formData.get("title")?.toString().trim();
  const body = formData.get("body")?.toString().trim();
  if (!title || !body) return { error: "A title and note are required." };

  const { error } = await supabase.from("player_diary_entries").insert({
    user_id: user.id,
    title,
    body,
    entry_type: formData.get("entryType")?.toString() || "note",
    entity_type: formData.get("entityType")?.toString() || null,
    entity_id: formData.get("entityId")?.toString() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/diary");
  return { success: true };
}

export async function createCollectionAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;

  if (!name) {
    return { error: "Collection name is required." };
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name,
      description,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collection");
  return { success: true, collection: data };
}

export async function renameCollectionAction(collectionId: string, name: string, description?: string) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized");
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { error: "Collection name is required." };
  }

  const { error } = await supabase
    .from("collections")
    .update({
      name: cleanName,
      description: description !== undefined ? description.trim() || null : undefined,
    })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collection");
  return { success: true };
}

export async function deleteCollectionAction(collectionId: string) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized");
  }

  // Check if collection is default
  const { data: col } = await supabase
    .from("collections")
    .select("is_default")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .single();

  if (col?.is_default) {
    return { error: "Cannot delete your default collection." };
  }

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collection");
  return { success: true };
}

export async function addOrUpdateHoldingAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized");
  }

  const comicId = formData.get("comicId")?.toString().trim();
  const ppcfId = formData.get("ppcfId")?.toString().trim() || null;
  let collectionId = formData.get("collectionId")?.toString().trim();
  const quantityRaw = parseInt(formData.get("quantity")?.toString() || "1", 10);
  const quantity = isNaN(quantityRaw) || quantityRaw < 1 ? 1 : quantityRaw;
  const grade = formData.get("grade")?.toString().trim() || null;
  const gradingCompany = formData.get("gradingCompany")?.toString().trim() || null;
  const certNumber = formData.get("certificationNumber")?.toString().trim() || null;
  const acqDate = formData.get("acquisitionDate")?.toString().trim() || null;
  const acqCostRaw = formData.get("acquisitionCost")?.toString().trim();
  const acquisitionCost = acqCostRaw && !isNaN(parseFloat(acqCostRaw)) ? Math.max(parseFloat(acqCostRaw), 0) : null;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!comicId) {
    return { error: "Invalid comic ID." };
  }

  // Ensure default collection if not specified
  if (!collectionId) {
    const defaultCol = await ensureDefaultCollection(user.id);
    if (!defaultCol) {
      return { error: "Could not locate default collection." };
    }
    collectionId = defaultCol.id;
  }

  // Upsert holding in collection
  const { data, error } = await supabase
    .from("collection_items")
    .upsert(
      {
        collection_id: collectionId,
        user_id: user.id,
        comic_id: comicId,
        ppcf_id: ppcfId,
        quantity,
        grade,
        grading_company: gradingCompany,
        certification_number: certNumber,
        acquisition_date: acqDate || null,
        acquisition_cost: acquisitionCost,
        notes,
        ownership_status: "owned",
      },
      { onConflict: "collection_id,comic_id" }
    )
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collection");
  revalidatePath(`/comics/${comicId}`);
  return { success: true, item: data };
}

export async function removeHoldingAction(itemId: string, comicId?: string) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collection");
  if (comicId) {
    revalidatePath(`/comics/${comicId}`);
  }
  return { success: true };
}

export async function toggleWatchlistAction(comicId: string, ppcfId?: string | null) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized");
  }

  // Check if exists
  const { data: existing } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("comic_id", comicId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("watchlist_items")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    revalidatePath("/watchlist");
    revalidatePath(`/comics/${comicId}`);
    return { inWatchlist: false };
  } else {
    await supabase
      .from("watchlist_items")
      .insert({
        user_id: user.id,
        comic_id: comicId,
        ppcf_id: ppcfId || null,
      });

    revalidatePath("/watchlist");
    revalidatePath(`/comics/${comicId}`);
    return { inWatchlist: true };
  }
}
