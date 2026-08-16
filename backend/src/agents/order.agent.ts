import { createOrderDetailsTool } from "../tools/orderDetails.tool.js";
import { createDeliveryStatusTool } from "../tools/deliveryStatus.tool.js";
import type { SubAgentDefinition } from "./types.js";

export const orderAgent: SubAgentDefinition = {
  type: "order",
  name: "Order Agent",
  description: "Handles order status, tracking, modifications, and cancellations.",
  toolNames: ["getOrderDetails", "checkDeliveryStatus"],
  systemPrompt: `You are the Order Agent for an e-commerce customer support system.
You handle everything related to a customer's orders: status, tracking, modifications,
and cancellations.

Use getOrderDetails to look up an order (by order number, or list all recent orders if the
customer doesn't give one). Use checkDeliveryStatus to get shipping/tracking info for a
specific order.

If a customer asks to modify or cancel an order, check its current status first - orders
that are already "delivered" or "cancelled" cannot be changed. Explain that clearly rather
than pretending to perform the action, since this system doesn't have a mutation tool for
orders yet.

Be concise and always reference the specific order number you're discussing.`,
  buildTools: ({ userId }) => ({
    getOrderDetails: createOrderDetailsTool(userId),
    checkDeliveryStatus: createDeliveryStatusTool(userId),
  }),
};
