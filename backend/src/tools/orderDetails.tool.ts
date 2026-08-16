import { tool } from "ai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { orders } from "../db/schema.js";

// scoped to userId in the query itself - if the model somehow gets handed
// someone else's order number it just won't find it, no separate check needed
export function createOrderDetailsTool(userId: number) {
  return tool({
    description:
      "Fetch order details for the current customer. Pass a specific order number to look up one " +
      "order, or omit it to list all of the customer's recent orders.",
    parameters: z.object({
      orderNumber: z.string().optional().describe("e.g. 'ORD-1001'. Omit to list all recent orders."),
    }),
    execute: async ({ orderNumber }) => {
      const rows = await db
        .select()
        .from(orders)
        .where(
          orderNumber
            ? and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber))
            : eq(orders.userId, userId),
        );

      if (orderNumber && rows.length === 0) {
        return { found: false, message: `No order found with number ${orderNumber} for this customer.` };
      }

      return { found: true, orders: rows };
    },
  });
}
