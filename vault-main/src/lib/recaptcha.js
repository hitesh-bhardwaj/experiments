const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5;

export async function verifyRecaptcha(token, expectedAction) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY is not configured.");
    return { success: false };
  }

  if (!token) {
    return { success: false };
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = await response.json();

    if (!data.success || data.score < MIN_SCORE) {
      return { success: false, score: data.score };
    }

    if (expectedAction && data.action !== expectedAction) {
      return { success: false, score: data.score };
    }

    return { success: true, score: data.score };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return { success: false };
  }
}
