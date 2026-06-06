export function safeAuthNext(value: FormDataEntryValue | string | null | undefined, fallback = "/workbench") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function authMessage(path: string, message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("message", message);
  return `${pathname}?${params.toString()}`;
}

/** Like authMessage but uses ?success= so pages can render a green confirmation. */
export function authSuccess(path: string, message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("success", message);
  return `${pathname}?${params.toString()}`;
}

export function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit")) {
    return "Supabase email rate limit reached. Wait for the throttle window to reset, or configure custom SMTP before more signup testing.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email is not confirmed yet. Open the Supabase confirmation email, then sign in again.";
  }
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "An account already exists for that email. Sign in, or use the confirmation email if it is still pending.";
  }
  if (normalized.includes("weak password") || normalized.includes("password should be")) {
    return "Use a stronger password with at least 8 characters.";
  }
  return message;
}

export function passwordMeetsMinimum(value: string) {
  return value.length >= 8;
}
