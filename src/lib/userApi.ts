const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function fetchUserDataByEmail(email: string) {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL not configured");
  const url = `${API_BASE}/get_user_data_by_email/${encodeURI(email)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}
