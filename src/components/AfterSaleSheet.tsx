/**
 * AfterSaleSheet Component
 *
 * Bottom sheet that appears after a sale is saved
 * Prompts user to send receipt via WhatsApp
 *
 * Matches reference artboard exactly:
 * - Title: "Sale saved"
 * - Subtitle: "Send receipt via WhatsApp?"
 * - Receipt preview in light gray box
 * - Primary button (WhatsApp green): "Send via WhatsApp"
 * - Secondary button (outlined): "Skip"
 */

import React from "react";
import "./ReceiptUX.css";

type AfterSaleSheetProps = {
  open: boolean;
  receiptText: string;
  onSend: () => void;
  onSkip: () => void;
};

export default function AfterSaleSheet({
  open,
  receiptText,
  onSend,
  onSkip,
}: AfterSaleSheetProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={"sheet-mask " + (open ? "open" : "")}
        onClick={onSkip}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div className="sheet" role="dialog" aria-label="Send receipt">
        {/* Title */}
        <h3>Sale saved</h3>

        {/* Subtitle */}
        <p className="sub">Send receipt via WhatsApp?</p>

        {/* Receipt Preview */}
        <div className="preview" aria-live="polite">
          {receiptText}
        </div>

        {/* Action Buttons */}
        <div className="row">
          <button
            className="btn primary"
            onClick={onSend}
            aria-label="Send receipt via WhatsApp"
          >
            Send via WhatsApp
          </button>
          <button className="btn" onClick={onSkip} aria-label="Skip sending receipt">
            Skip
          </button>
        </div>
      </div>
    </>
  );
}
