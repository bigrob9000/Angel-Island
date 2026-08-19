type ProfileSaveError = {
  message?: string;
  code?: string;
};

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 2) {
    return "Username needs at least 2 characters.";
  }
  if (trimmed.length > 30) {
    return "Username can't be longer than 30 characters.";
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Use lowercase letters, numbers, and underscores only.";
  }
  return null;
}

export function formatProfileSaveError(error: ProfileSaveError): string {
  const message = error.message ?? "";

  if (error.code === "23505") {
    if (message.includes("username") || message.includes("profiles_username")) {
      return "That username is already taken. Try another.";
    }
    return "Something you entered is already in use. Try different values.";
  }

  if (error.code === "23514") {
    if (message.includes("username")) {
      return "That username isn't allowed. Use letters, numbers, and underscores.";
    }
    return "Something you entered didn't pass validation. Check your profile fields.";
  }

  if (error.code === "42501") {
    return "Permission denied. Sign out and back in, then try again.";
  }

  if (message.includes("duplicate key") && message.includes("username")) {
    return "That username is already taken. Try another.";
  }

  return message || "Could not save your profile. Try again.";
}
