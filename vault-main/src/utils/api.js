import { getToken } from "./config.js";

const API_BASE_URL =
  process.env.HYPERIUX_API_URL || "https://vault.hyperiux.com";

export async function fetchEffect(effectName) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/cli/effects/${effectName}`,
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message = data?.requiresPro
      ? `
This is a Pro Effect.

Generate a CLI token from your Hyperiux dashboard:
${API_BASE_URL}/dashboard

Then run:
npx hyperiux login hpx_your_token_here
npx hyperiux add ${effectName}
`
      : data.error || "Unable to fetch effect.";

    throw new Error(message);
  }

  return data;
}