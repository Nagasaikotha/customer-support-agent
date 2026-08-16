import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { invoices, refunds } from "../db/schema.js";

/** Billing Agent's tool: checks the status of a refund request tied to an invoice. */
export function createRefundStatusTool(userId: number) {
  return tool({
    description: "Check the status of a refund request for a given invoice number.",
    parameters: z.object({
      invoiceNumber: z.string().describe("e.g. 'INV-3001'"),
    }),
    execute: async ({ invoiceNumber }) => {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber));

      if (!invoice || invoice.userId !== userId) {
        return { found: false, message: `No invoice found with number ${invoiceNumber} for this customer.` };
      }

      const refundRows = await db.select().from(refunds).where(eq(refunds.invoiceId, invoice.id));

      if (refundRows.length === 0) {
        return { found: true, refunds: [], message: "No refund has been requested for this invoice." };
      }

      return { found: true, refunds: refundRows };
    },
  });
}
