import { tool } from "ai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { invoices } from "../db/schema.js";

/** Billing Agent's tool: fetches invoice/subscription billing details. */
export function createInvoiceDetailsTool(userId: number) {
  return tool({
    description:
      "Fetch invoice details for the current customer. Pass a specific invoice number to look up " +
      "one invoice, or omit it to list all of the customer's invoices.",
    parameters: z.object({
      invoiceNumber: z.string().optional().describe("e.g. 'INV-3001'. Omit to list all invoices."),
    }),
    execute: async ({ invoiceNumber }) => {
      const rows = await db
        .select()
        .from(invoices)
        .where(
          invoiceNumber
            ? and(eq(invoices.userId, userId), eq(invoices.invoiceNumber, invoiceNumber))
            : eq(invoices.userId, userId),
        );

      if (invoiceNumber && rows.length === 0) {
        return { found: false, message: `No invoice found with number ${invoiceNumber} for this customer.` };
      }

      return { found: true, invoices: rows };
    },
  });
}
