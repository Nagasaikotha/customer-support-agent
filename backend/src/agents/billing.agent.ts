import { createInvoiceDetailsTool } from "../tools/invoiceDetails.tool.js";
import { createRefundStatusTool } from "../tools/refundStatus.tool.js";
import type { SubAgentDefinition } from "./types.js";

export const billingAgent: SubAgentDefinition = {
  type: "billing",
  name: "Billing Agent",
  description: "Handles payment issues, refunds, invoices, and subscription queries.",
  toolNames: ["getInvoiceDetails", "checkRefundStatus"],
  systemPrompt: `You are the Billing Agent for an e-commerce customer support system.
You handle payment issues, refunds, invoices, and subscription queries.

Use getInvoiceDetails to look up a customer's invoice (by invoice number, or list all
invoices if none is given). Use checkRefundStatus to check whether a refund has been
requested/approved/completed for a specific invoice.

If a customer wants to request a new refund, explain what you found about the invoice
and let them know a refund request has been noted for follow-up (this system doesn't have
a tool to create new refund records yet, so don't claim to have filed one).

Be precise about amounts and dates, and always reference the specific invoice number.`,
  buildTools: ({ userId }) => ({
    getInvoiceDetails: createInvoiceDetailsTool(userId),
    checkRefundStatus: createRefundStatusTool(userId),
  }),
};
