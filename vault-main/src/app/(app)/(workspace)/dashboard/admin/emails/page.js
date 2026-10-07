"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

const EMAIL_TYPES = [
  "all",
  "welcome",
  "reset_password_code",
  "password_changed",
  "password_reset_otp",
  "pro_unlocked",
  "invitations",
  "subscription_invoice",
  "custom_animation_request",
  "custom_animation_request_confirmation",
  "work_with_hyperiux",
  "work_with_hyperiux_confirmation",
  "verification_code",
  "password_removed",
  "primary_email_address_changed",
  "account_locked",
  "new_device_sign_in",
];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function TypeLabel({ type }) {
  const labels = {
    welcome: "Welcome",
    reset_password_code: "Reset Password Code",
    password_changed: "Password Changed",
    password_reset_otp: "Password Reset OTP",
    pro_unlocked: "Pro Unlocked",
    invitations: "Invitations",
    subscription_invoice: "Invoice",
    custom_animation_request: "Animation Request",
    custom_animation_request_confirmation: "Animation Request Confirmation",
    work_with_hyperiux: "Work Enquiry",
    work_with_hyperiux_confirmation: "Work Enquiry Confirmation",
    verification_code: "Verification Code",
    password_removed: "Password Removed",
    primary_email_address_changed: "Primary Email Changed",
    account_locked: "Account Locked",
    new_device_sign_in: "New Device Sign-In",
    transactional: "Transactional",
  };
  return <span className="text-xs text-white/55">{labels[type] || type}</span>;
}

function EmailPreviewModal({ emailId, onClose }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    fetch(`/api/admin/emails?id=${emailId}`)
      .then((r) => r.json())
      .then(setEmail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [emailId]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-900 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col  border border-white/15 bg-[#0a0a0a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="max-lg:hidden group absolute right-5 top-4 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
        >
          <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-white" />
            <span className="absolute h-px w-4 -rotate-45 bg-white" />
          </div>
        </button>

        {/* Header */}
        <div className="flex items-start h-[5vw] max-md:h-[20vw] justify-between gap-4 px-6 py-4 pr-16 border-b border-white/10">
          <div className="min-w-0">
            {loading ? (
              <div className="h-4 w-48  bg-white/10 animate-pulse" />
            ) : (
              <>
                <p className="text-sm font-medium text-white truncate">{email?.subject}</p>
                <p className="text-xs text-white/45 mt-0.5">{email?.recipient_email} · {formatDate(email?.sent_at)}</p>
              </>
            )}
          </div>
        </div>

        {/* Email HTML preview */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-white/40 text-sm">
              Loading…
            </div>
          ) : email?.html_content ? (
            <iframe
              ref={iframeRef}
              srcDoc={email.html_content}
              sandbox="allow-popups"
              className="w-full h-full min-h-[500px] border-0"
              title="Email preview"
            />
          ) : (
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-white/60 font-mono">
                {email?.text_content || "No content available."}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 10;

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  // Delivered/failed counts across every row matching the current filters -
  // fetched from the API, not derived from `emails` (which is only the
  // current page) - counting just the current page is exactly what made
  // "10 delivered" show up next to "2257 total".
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [previewId, setPreviewId] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [prevTypeFilter, setPrevTypeFilter] = useState(typeFilter);
  const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);
  const [prevPageSize, setPrevPageSize] = useState(pageSize);

  // Reset to page 1 whenever a filter changes - derived purely from values
  // already available during render, so adjust it here instead of in an effect.
  if (prevTypeFilter !== typeFilter || prevStatusFilter !== statusFilter || prevPageSize !== pageSize) {
    setPrevTypeFilter(typeFilter);
    setPrevStatusFilter(statusFilter);
    setPrevPageSize(pageSize);
    setCurrentPage(1);
  }

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", String(pageSize));
      params.set("offset", String((currentPage - 1) * pageSize));

      const res = await fetch(`/api/admin/emails?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load emails");
      setEmails(json.emails || []);
      setTotal(json.total || 0);
      setSuccessCount(json.successCount || 0);
      setFailedCount(json.failedCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, pageSize, currentPage]);

  useEffect(() => {
    // Fetches from a network API in response to filter/page changes - this
    // is a genuine external-system sync, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmails();
  }, [fetchEmails]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <AnimatePresence>
        {previewId && (
          <EmailPreviewModal emailId={previewId} onClose={() => setPreviewId(null)} />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/dashboard/admin"
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                User Management
              </Link>
            </div>
            <h1 className="text-2xl font-semibold">Email Log</h1>
            <p className="mt-1 text-sm text-white/50">
              {total} total · {successCount} delivered · {failedCount} failed
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={EMAIL_TYPES.map((t) => ({
              value: t,
              label: t === "all" ? "All types" : t,
            }))}
            panelClassName="max-h-[20vw] overflow-y-auto"
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              { value: "success", label: "Success" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <div className="flex items-center gap-2 text-sm text-white/45">
            Per page
            <CustomSelect
              size="compact"
              value={String(pageSize)}
              onChange={(value) => setPageSize(Number(value))}
              options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        </div>

        {error && (
          <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className=" border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Sent At</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/45 uppercase tracking-wider">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4  bg-white/8 animate-pulse" style={{ width: j === 1 ? "200px" : "100px" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-white/40">
                      No emails found.
                    </td>
                  </tr>
                ) : (
                  emails.map((email) => (
                    <tr key={email.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <span className="text-white/80 truncate block max-w-48">{email.recipient_email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white truncate block max-w-64">{email.subject}</span>
                        {email.error_message && (
                          <span className="text-xs text-red-400 truncate block max-w-64">{email.error_message}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TypeLabel type={email.email_type} />
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">
                        {formatDate(email.sent_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setPreviewId(email.id)}
                          className=" px-3 py-1.5 text-xs font-medium bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && emails.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-white/45">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center  border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center  border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
