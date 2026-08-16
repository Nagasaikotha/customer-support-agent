import { tool } from "ai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { orders, deliveries } from "../db/schema.js";

/** Order Agent's tool: checks shipping/delivery status for a specific order. */
export function createDeliveryStatusTool(userId: number) {
  return tool({
    description: "Check the shipping/delivery status (carrier, tracking number, ETA) for an order.",
    parameters: z.object({
      orderNumber: z.string().describe("e.g. 'ORD-1001'"),
    }),
    execute: async ({ orderNumber }) => {
      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)));

      if (!order) {
        return { found: false, message: `No order found with number ${orderNumber} for this customer.` };
      }

      const [delivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, order.id));

      if (!delivery) {
        return {
          found: true,
          status: order.status,
          message: "This order has no shipment tracking yet (still processing).",
        };
      }

      return {
        found: true,
        status: order.status,
        carrier: delivery.carrier,
        trackingNumber: delivery.trackingNumber,
        estimatedDelivery: delivery.estimatedDelivery,
        lastUpdate: delivery.lastUpdate,
      };
    },
  });
}
