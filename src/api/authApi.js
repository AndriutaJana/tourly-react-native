export const BASE_URL = "http://192.168.100.5:3001";

export async function apiRegister(payload) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Register failed");
  return data;
}

export async function apiLogin(payload) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Login failed");
  return data;
}

export async function apiMe(token) {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Me failed");
  return data;
}

export async function apiUpdateProfile(
  token,
  { fullName, username, phone, avatarUri }
) {
  const form = new FormData();

  if (fullName !== undefined) form.append("fullName", fullName);
  if (username !== undefined) form.append("username", username);
  if (phone !== undefined && phone !== null)
    form.append("phone", String(phone));

  if (avatarUri) {
    const ext = avatarUri.split(".").pop()?.toLowerCase() || "jpg";
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "heic"
        ? "image/heic"
        : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

    form.append("avatar", {
      uri: avatarUri,
      name: `avatar.${ext}`,
      type: mime,
    });
  }

  const res = await fetch(`${BASE_URL}/api/auth/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Update profile failed");
  return data;
}

export async function apiChangePassword(token, payload) {
  const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Change password failed");
  return data;
}

export async function apiDeleteAccount(token, payload) {
  const res = await fetch(`${BASE_URL}/api/auth/delete-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Delete account failed");
  return data;
}
