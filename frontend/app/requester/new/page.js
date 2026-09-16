"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createRequest,
  uploadSupportingDocument,
} from "@/app/lib/api";

import { useApiToken } from "@/app/lib/clientAuth";

import {
  ROUTING_CHAINS,
  ROLES,
} from "@/app/lib/workflow";


const TYPE_OPTIONS =
  Object.entries(ROUTING_CHAINS);


const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".csv",
];


const MAX_FILE_SIZE =
  10 * 1024 * 1024;


export default function NewRequestPage() {
  const router = useRouter();
  const getToken = useApiToken();

  const [
    requestType,
    setRequestType,
  ] = useState("leave");

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    vendor,
    setVendor,
  ] = useState("");

  const [
    leaveType,
    setLeaveType,
  ] = useState("");

  const [
    fromDate,
    setFromDate,
  ] = useState("");

  const [
    toDate,
    setToDate,
  ] = useState("");

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    additionalNotes,
    setAdditionalNotes,
  ] = useState("");

  const [
    managerEmail,
    setManagerEmail,
  ] = useState("");

  const [
    supportingDocument,
    setSupportingDocument,
  ] = useState(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const meta =
    ROUTING_CHAINS[requestType];

  const isLeave =
    requestType === "leave";

  const needsVendor =
    requestType === "purchase" ||
    requestType === "capex";


  const numberOfDays =
    fromDate && toDate
      ? Math.floor(
          (
            new Date(toDate) -
            new Date(fromDate)
          ) /
            (
              1000 *
              60 *
              60 *
              24
            )
        ) + 1
      : 0;


  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0] || null;

    if (!selectedFile) {
      setSupportingDocument(null);
      return;
    }

    const extension =
      selectedFile.name
        .substring(
          selectedFile.name.lastIndexOf(".")
        )
        .toLowerCase();

    if (
      !ALLOWED_FILE_EXTENSIONS.includes(
        extension
      )
    ) {
      setSupportingDocument(null);

      setError(
        "Only PDF, DOC, DOCX and CSV files are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setSupportingDocument(null);

      setError(
        "Supporting document must be 10 MB or smaller."
      );

      event.target.value = "";
      return;
    }

    setError("");

    setSupportingDocument(
      selectedFile
    );
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (!title.trim()) {
        throw new Error(
          "Please enter a title."
        );
      }

      if (!description.trim()) {
        throw new Error(
          "Please enter a description."
        );
      }

      if (isLeave) {
        if (!leaveType) {
          throw new Error(
            "Please select a leave type."
          );
        }

        if (
          !fromDate ||
          !toDate
        ) {
          throw new Error(
            "Please select the from and to dates."
          );
        }

        if (toDate < fromDate) {
          throw new Error(
            "To date cannot be before from date."
          );
        }

        if (!reason.trim()) {
          throw new Error(
            "Please provide a reason for the leave."
          );
        }

        if (!managerEmail.trim()) {
          throw new Error(
            "Please provide the manager's email."
          );
        }
      } else {
        if (!amount) {
          throw new Error(
            "Please enter the amount."
          );
        }
      }

      const payload = {
        title: title.trim(),

        description:
          description.trim(),

        request_type:
          requestType,

        // Leave has no monetary amount.
        amount:
          isLeave
            ? null
            : Number(amount),

        vendor:
          needsVendor
            ? vendor.trim() || null
            : null,

        // Leave fields.
        leave_type:
          isLeave
            ? leaveType
            : null,

        from_date:
          isLeave
            ? fromDate
            : null,

        to_date:
          isLeave
            ? toDate
            : null,

        number_of_days:
          isLeave
            ? numberOfDays
            : null,

        reason:
          isLeave
            ? reason.trim()
            : null,

        additional_notes:
          isLeave
            ? additionalNotes.trim() || null
            : null,

        // Exact manager who should receive
        // the Leave approval task.
        manager_email:
          isLeave
            ? managerEmail
                .trim()
                .toLowerCase()
            : null,
      };


      const token =
        await getToken();


      const createdRequest =
        await createRequest(
          payload,
          token
        );


      // Supporting document is optional.
      if (
        supportingDocument &&
        createdRequest?.id &&
        !createdRequest.__local
      ) {
        await uploadSupportingDocument(
          createdRequest.id,
          supportingDocument,
          token
        );
      }


      router.push(
        "/requester"
      );

      router.refresh();

    } catch (submitError) {
      setError(
        submitError.message ||
          "Unable to submit the request."
      );

    } finally {
      setSaving(false);
    }
  }


  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">
        New request
      </h1>

      <p className="text-sm text-slate mb-8">
        Choose a request type and provide the
        details for approval.
      </p>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 space-y-5"
        >

          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Request type
            </label>

            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(
                ([key, value]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      setRequestType(key);
                      setError("");
                    }}
                    className={`text-left border rounded px-3 py-2.5 text-sm transition-colors ${
                      requestType === key
                        ? "border-pine bg-pine-soft text-pine-dark font-medium"
                        : "border-line bg-paper text-ink/70 hover:border-ink/30"
                    }`}
                  >
                    {value.label}
                  </button>
                )
              )}
            </div>
          </div>


          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Title
            </label>

            <input
              required
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
            />
          </div>


          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Description
            </label>

            <textarea
              required
              rows={4}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
            />
          </div>


          {/* Amount */}
          {!isLeave && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Amount (₹)
              </label>

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
              />
            </div>
          )}


          {/* Vendor */}
          {needsVendor && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Vendor
              </label>

              <input
                value={vendor}
                onChange={(event) =>
                  setVendor(
                    event.target.value
                  )
                }
                className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
              />
            </div>
          )}


          {/* Leave Fields */}
          {isLeave && (
            <>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Leave type
                </label>

                <select
                  required
                  value={leaveType}
                  onChange={(event) =>
                    setLeaveType(
                      event.target.value
                    )
                  }
                  className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                >
                  <option value="">
                    Select leave type
                  </option>

                  <option value="casual">
                    Casual Leave
                  </option>

                  <option value="sick">
                    Sick Leave
                  </option>

                  <option value="earned">
                    Earned Leave
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    From date
                  </label>

                  <input
                    required
                    type="date"
                    value={fromDate}
                    onChange={(event) =>
                      setFromDate(
                        event.target.value
                      )
                    }
                    className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    To date
                  </label>

                  <input
                    required
                    type="date"
                    min={
                      fromDate ||
                      undefined
                    }
                    value={toDate}
                    onChange={(event) =>
                      setToDate(
                        event.target.value
                      )
                    }
                    className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                  />
                </div>

              </div>


              {/* Number of days */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Number of days
                </label>

                <input
                  type="text"
                  readOnly
                  value={
                    numberOfDays > 0
                      ? numberOfDays
                      : ""
                  }
                  placeholder="Calculated automatically"
                  className="w-full border border-line rounded px-3 py-2 text-sm bg-canvas text-ink"
                />
              </div>


              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Reason
                </label>

                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value
                    )
                  }
                  className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                />
              </div>


              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Additional notes
                </label>

                <textarea
                  rows={3}
                  value={additionalNotes}
                  onChange={(event) =>
                    setAdditionalNotes(
                      event.target.value
                    )
                  }
                  className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                />
              </div>


              {/* Manager Email */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Manager email
                </label>

                <input
                  required
                  type="email"
                  value={managerEmail}
                  onChange={(event) =>
                    setManagerEmail(
                      event.target.value
                    )
                  }
                  placeholder="manager@company.com"
                  className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                />

                <p className="text-xs text-slate mt-1.5">
                  This email determines which
                  manager receives the Leave approval
                  request. Other managers will not
                  receive this request.
                </p>
              </div>
            </>
          )}


          {/* Supporting Document */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Supporting document
            </label>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
              onChange={handleFileChange}
              className="w-full border border-line rounded px-3 py-2 text-sm bg-paper"
            />

            <p className="text-xs text-slate mt-1.5">
              Optional. Allowed formats:
              PDF, DOC, DOCX and CSV.
              Maximum size: 10 MB.
            </p>

            {supportingDocument && (
              <p className="text-xs text-pine mt-2">
                Selected:{" "}
                {supportingDocument.name}
              </p>
            )}
          </div>


          {/* Error */}
          {error ? (
            <p className="text-sm text-brick">
              {error}
            </p>
          ) : null}


          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="bg-pine text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-pine-dark transition-colors disabled:opacity-60"
          >
            {saving
              ? "Submitting…"
              : "Submit request"}
          </button>

        </form>


        {/* Approval Routing */}
        <aside className="border border-line bg-paper rounded p-5 h-fit">

          <p className="text-xs uppercase tracking-wide text-slate mb-3">
            Approval routing
          </p>

          <ol className="space-y-3">
            {meta.chain.map(
              (
                roleKey,
                index
              ) => (
                <li
                  key={roleKey}
                  className="flex items-center gap-3"
                >
                  <span className="h-6 w-6 rounded-full bg-canvas text-ink/60 text-xs font-medium flex items-center justify-center border border-line">
                    {index + 1}
                  </span>

                  <span className="text-sm text-ink">
                    {
                      ROLES[
                        roleKey
                      ].label
                    }
                  </span>
                </li>
              )
            )}
          </ol>

          <p className="text-xs text-slate mt-4 pt-4 border-t border-line">
            {meta.description}

            {!isLeave
              ? " Requests below ₹50,000 stop after manager approval."
              : " Leave requests are sent only to the manager email entered above."}
          </p>

        </aside>

      </div>
    </div>
  );
}