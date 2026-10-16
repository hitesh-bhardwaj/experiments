// A person's name for the UI, on the client and the server. Accounts made with Google or
// GitHub come with a name; accounts made with an email and password often don't, so the
// name falls back to the one most addresses start with:
//   "harsh.goyal99@example.com" -> "Harsh Goyal" (first name "Harsh").
// An address with no separators gives one word ("harshgoyal@…" -> "Harshgoyal").

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// The words in an email's local part: no +tag, split on . _ - and digits, letters only
function emailWords(email) {
  const local = String(email || "").split("@")[0].split("+")[0];
  return local
    .split(/[._\-\d]+/)
    .filter((word) => /^[a-z]{2,}$/i.test(word))
    .map(capitalize);
}

export function nameFromEmail(email) {
  return emailWords(email).slice(0, 2).join(" ") || null;
}

const emailOf = (user) => user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null;

/** Full name: the account's own, else one read from its email; null without either. */
export function displayName(user) {
  if (!user) return null;
  const own = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ");
  return own || nameFromEmail(emailOf(user));
}

/** First name, for greetings: the account's own, else the email's first word. */
export function displayFirstName(user) {
  if (!user) return null;
  return user.firstName || user.fullName?.split(" ")[0] || emailWords(emailOf(user))[0] || null;
}
