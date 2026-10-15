"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Eye, EyeOff, LoaderCircle, Trash2, Upload, User } from "lucide-react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/SignInRequiredModal";
import { useUser } from "@clerk/nextjs";
import { useAdminRole } from "@/lib/useAdminRole";
import { ACTION_LINE, ACTION_PRIMARY, CARD, CARD_PAD, FIELD, FIELD_LABEL, SubmitButton } from "@/components/Dashboard/DashboardUI";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDashboardPreview, samplePreviewUser } from "@/lib/dev/dashboardPreview";

const MAX_AVATAR_DIMENSION = 512;

const subscribeNever = () => () => {};

const ROLE_LABELS = { admin: "Admin", super_admin: "Super admin" };

function RoleBadge({ role }) {
  if (!ROLE_LABELS[role]) return null;
  return <span className="type-small inline-flex w-fit bg-primary/10 px-2.5 py-1 text-ink ring-1 ring-inset ring-primary/30">{ROLE_LABELS[role]}</span>;
}

// Clerk's profile image upload rejects anything over its size cap - PNG
// screenshots regularly blow past that at full resolution even though a
// same-size JPEG wouldn't, which is why PNG uploads specifically looked
// broken. Downscaling to a sane avatar size before upload fixes it without
// needing the user to manually compress the file first.
async function resizeImageForUpload(file, maxDimension = MAX_AVATAR_DIMENSION) {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

  if (scale >= 1) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, file.type || "image/png", 0.92)
  );

  if (!blob) return file;

  return new File([blob], file.name, { type: blob.type });
}

export default function SettingsPage() {
  const clerk = useUser();
  // Development preview: a stand-in user, since there's no session
  const [previewUser, setPreviewUser] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getDashboardPreview()) setPreviewUser(samplePreviewUser());
  }, []);
  const user = previewUser || clerk.user;
  const isLoaded = Boolean(previewUser) || clerk.isLoaded;

  // Delete account: a request to the team, confirmed in a dialog first
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requestingDelete, setRequestingDelete] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  async function requestDeletion() {
    setRequestingDelete(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/user/delete-request", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn’t send your request.");
      setDeleteRequested(true);
      setDeleteOpen(false);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setRequestingDelete(false);
    }
  }
  const { role } = useAdminRole();
  const fileInputRef = useRef(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password change
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);

  // Forgot password OTP flow
  const [otpStep, setOtpStep] = useState("idle"); // idle | sent | verifying
  const [otpCode, setOtpCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (!user) return;

    // capture before async - event.currentTarget becomes null after await
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");

    if (!currentPassword || !newPassword) {
      setPwError("Both fields are required.");
      return;
    }

    setSavingPw(true);
    setPwMessage("");
    setPwError("");

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPwError(data.error || "Unable to update password.");
        return;
      }

      form.reset();
      setPwMessage("Password updated successfully.");
    } catch (err) {
      console.error("Password change error:", err);
      setPwError("Something went wrong. Please try again.");
    } finally {
      setSavingPw(false);
    }
  }

  async function handleForgotPassword() {
    setSendingOtp(true);
    setPwError("");
    setPwMessage("");

    try {
      const res = await fetch("/api/user/send-reset-otp", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setPwError(data.error || "Unable to send OTP. Please try again.");
        return;
      }

      setOtpStep("sent");
    } catch {
      setPwError("Something went wrong. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleOtpReset(event) {
    event.preventDefault();

    if (!otpCode || !resetNewPassword) {
      setPwError("Please enter the OTP and your new password.");
      return;
    }

    setResettingPw(true);
    setPwError("");

    try {
      const res = await fetch("/api/user/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode, newPassword: resetNewPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPwError(data.error || "Invalid OTP or something went wrong.");
        return;
      }

      setPwMessage("Password reset successfully.");
      setOtpStep("idle");
      setOtpCode("");
      setResetNewPassword("");
    } catch {
      setPwError("Something went wrong. Please try again.");
    } finally {
      setResettingPw(false);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!user) return;

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();

    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      await user.update({
        firstName,
        lastName,
      });
      await user.reload();
      setMessage("Profile updated.");
    } catch (err) {
      console.error(err);
      setError("Unable to update your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!user || !file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    setSavingImage(true);
    setMessage("");
    setError("");

    try {
      const uploadFile = await resizeImageForUpload(file);

      await user.setProfileImage({ file: uploadFile });
      await user.reload();
      setMessage("Profile picture updated.");
    } catch (err) {
      console.error(err);
      setError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Unable to update your profile picture."
      );
    } finally {
      setSavingImage(false);
      event.target.value = "";
    }
  }

  async function handleImageDelete() {
    if (!user) return;
    setDeletingImage(true);
    setMessage("");
    setError("");

    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      setMessage("Profile picture removed.");
    } catch (err) {
      console.error(err);
      setError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Unable to remove your profile picture."
      );
    } finally {
      setDeletingImage(false);
    }
  }

  if (!isLoaded) {
    return <Skeleton className="h-[calc(var(--cvw)*30)] w-full max-lg:h-96" />;
  }

  if (!user) {
    return (
      <div className={`${CARD} ${CARD_PAD}`}>
        <p className="type-body">Sign in to manage your settings.</p>
      </div>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <div className="flex items-start gap-[calc(var(--cvw)*2.4)] max-lg:flex-col max-lg:gap-6">
      {/* sections, pinned beside them on desktop */}
      <nav aria-label="Settings sections" className="sticky top-28 flex w-[16%] shrink-0 flex-col gap-3 max-lg:static max-lg:w-full max-lg:flex-row max-lg:flex-wrap">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="type-label w-fit text-black/60 transition-colors duration-300 hover:text-primary">
            {label}
          </a>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-[calc(var(--cvw)*0.8)] max-lg:w-full max-lg:gap-3">
        {/* profile: photo, name, email */}
        <section id="profile" aria-labelledby="profile-h" className={`${CARD} ${CARD_PAD} scroll-mt-32 gap-[calc(var(--cvw)*1.4)] max-lg:gap-5`}>
          <div className="flex flex-col gap-1">
            <h2 id="profile-h" className="type-h3">
              Profile
            </h2>
            <p className="type-small text-black/60">How you appear across Vault.</p>
          </div>

          <div className="flex items-center gap-[calc(var(--cvw)*1.4)] max-md:flex-col max-md:items-start max-lg:gap-5">
            <div className="relative size-[calc(var(--cvw)*6)] shrink-0 overflow-hidden rounded-full bg-light ring-1 ring-inset ring-black/10 max-lg:size-20">
              {user.hasImage ? (
                <Image src={user.imageUrl} alt={user.fullName || "Profile picture"} fill sizes="96px" className="object-cover" />
              ) : (
                <span className="grid size-full place-items-center text-black/40">
                  <User className="size-8" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={savingImage || deletingImage} className={ACTION_PRIMARY}>
                  {savingImage ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                  {savingImage ? "Uploading…" : "Upload Photo"}
                </button>
                {user.hasImage && (
                  <button type="button" onClick={handleImageDelete} disabled={deletingImage || savingImage} className={ACTION_LINE}>
                    {deletingImage ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                    {deletingImage ? "Removing…" : "Remove"}
                  </button>
                )}
              </div>
              <p className="type-small text-black/60">PNG, JPG or WebP · square works best</p>
              <RoleBadge role={role} />
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
          </div>

          <form key={user.id} onSubmit={handleProfileSubmit} className="flex flex-col gap-[calc(var(--cvw)*1)] max-lg:gap-4">
            <div className="flex gap-[calc(var(--cvw)*1)] max-md:flex-col max-lg:gap-4">
              <label className={`${FIELD_LABEL} flex-1`}>
                First name
                <input name="firstName" defaultValue={user.firstName || ""} autoComplete="given-name" className={FIELD} />
              </label>
              <label className={`${FIELD_LABEL} flex-1`}>
                Last name
                <input name="lastName" defaultValue={user.lastName || ""} autoComplete="family-name" className={FIELD} />
              </label>
            </div>
            <div className={FIELD_LABEL}>
              Email
              <p className={`${FIELD} text-black/60`}>{email}</p>
            </div>
            {(message || error) && (
              <p role="status" className={`type-small ${error ? "text-primary" : "text-black/60"}`}>
                {error || message}
              </p>
            )}
            <SubmitButton label="Save Changes" busy={savingProfile} />
          </form>
        </section>

        {/* password: change it, or reset it with a code sent by email */}
        <section id="password" aria-labelledby="password-h" className={`${CARD} ${CARD_PAD} scroll-mt-32 gap-[calc(var(--cvw)*1.4)] max-lg:gap-5`}>
          <div className="flex flex-col gap-1">
            <h2 id="password-h" className="type-h3">
              Password
            </h2>
            <p className="type-small text-black/60">{otpStep === "idle" ? "Use at least 8 characters with a number or symbol." : `We sent a code to ${email}. Enter it with your new password.`}</p>
          </div>

          {otpStep === "idle" ? (
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-[calc(var(--cvw)*1)] max-lg:gap-4">
              <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" shown={showCurrentPw} onToggle={() => setShowCurrentPw((v) => !v)} />
              <PasswordField label="New password" name="newPassword" autoComplete="new-password" shown={showNewPw} onToggle={() => setShowNewPw((v) => !v)} />
              {(pwMessage || pwError) && (
                <p role="status" className={`type-small ${pwError ? "text-primary" : "text-black/60"}`}>
                  {pwError || pwMessage}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
                <SubmitButton label="Update Password" busy={savingPw} />
                <button type="button" onClick={handleForgotPassword} disabled={sendingOtp} className="type-label cursor-pointer text-black/60 underline underline-offset-3 transition-colors duration-300 hover:text-primary disabled:opacity-60">
                  {sendingOtp ? "Sending a code…" : "Forgot it?"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpReset} className="flex flex-col gap-[calc(var(--cvw)*1)] max-lg:gap-4">
              <label className={FIELD_LABEL}>
                Verification code
                <input type="text" inputMode="numeric" autoComplete="one-time-code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit code" className={FIELD} />
              </label>
              <PasswordField label="New password" autoComplete="new-password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} shown={showResetPw} onToggle={() => setShowResetPw((v) => !v)} />
              {(pwMessage || pwError) && (
                <p role="status" className={`type-small ${pwError ? "text-primary" : "text-black/60"}`}>
                  {pwError || pwMessage}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
                <SubmitButton label="Reset password" busy={resettingPw} />
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("idle");
                    setOtpCode("");
                    setResetNewPassword("");
                    setPwError("");
                  }}
                  className="type-label cursor-pointer text-black/60 underline underline-offset-3 transition-colors duration-300 hover:text-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* privacy & data: a request to delete the account */}
        <section id="privacy" aria-labelledby="privacy-h" className={`${CARD} ${CARD_PAD} scroll-mt-32 gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
          <div className="flex flex-col gap-1">
            <h2 id="privacy-h" className="type-h3">
              Privacy &amp; data
            </h2>
            <p className="type-small text-black/60">
              Under India’s DPDP Act you can access, correct or erase your data. See the{" "}
              <a href="/legal/privacy-policy" className="text-ink underline underline-offset-3 transition-colors duration-300 hover:text-primary">
                Privacy Policy
              </a>
              .
            </p>
          </div>
          <ul className="flex flex-col">
            <li className="flex items-center justify-between gap-4 py-[calc(var(--cvw)*0.9)] max-md:flex-col max-md:items-start max-lg:py-3">
              <span className="flex flex-col gap-1">
                <span className="type-body text-primary">Delete Account</span>
                <span className="type-small text-black/60">Removes your account and saves. Billing records are kept as the law requires. Installed code in your projects keeps working.</span>
              </span>
              <button type="button" onClick={() => setDeleteOpen(true)} disabled={deleteRequested} className={ACTION_LINE}>
                <Trash2 aria-hidden="true" />
                {deleteRequested ? "Requested" : "Delete account"}
              </button>
            </li>
          </ul>
        </section>

        {mounted &&
          createPortal(
            <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
              We’ll send your request to the team, who will confirm by email before anything is deleted. Billing records are kept as the law requires, and code in your projects keeps working.
              <div className="flex flex-col items-center gap-3">
                <SubmitButton type="button" label="Send deletion request" busy={requestingDelete} onClick={requestDeletion} />
                {deleteError && <p className="type-small text-primary">{deleteError}</p>}
              </div>
            </Modal>,
            document.body,
          )}
      </div>
    </div>
  );
}

// The sections, for the list beside them
const SECTIONS = [
  ["profile", "Profile"],
  ["password", "Password"],
  ["privacy", "Privacy & data"],
];

// A password field with show / hide
function PasswordField({ label, shown, onToggle, ...input }) {
  return (
    <label className={FIELD_LABEL}>
      {label}
      <span className="relative block">
        <input type={shown ? "text" : "password"} className={`${FIELD} pr-12`} {...input} />
        <button type="button" onClick={onToggle} aria-label={shown ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-black/40 transition-colors duration-300 hover:text-ink">
          {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}
