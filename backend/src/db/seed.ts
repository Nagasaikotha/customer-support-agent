import bcrypt from "bcryptjs";
import { db, pool } from "./client.js";
import {
  users,
  orders,
  deliveries,
  invoices,
  refunds,
  conversations,
  messages,
} from "./schema.js";

// wipes and reseeds (FK-safe order) so this can be rerun without hitting
// unique constraint errors - wanted something idempotent for repeated testing
async function seed() {
  console.log("Clearing existing data...");
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(refunds);
  await db.delete(invoices);
  await db.delete(deliveries);
  await db.delete(orders);
  await db.delete(users);

  console.log("Seeding users...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const [alice, bob] = await db
    .insert(users)
    .values([
      { email: "alice@example.com", passwordHash, name: "Alice Johnson" },
      { email: "bob@example.com", passwordHash, name: "Bob Martinez" },
    ])
    .returning();

  console.log("Seeding orders + deliveries...");
  const [order1, order2, order3] = await db
    .insert(orders)
    .values([
      {
        userId: alice.id,
        orderNumber: "ORD-1001",
        status: "out_for_delivery",
        itemsSummary: "Wireless Headphones x1, USB-C Cable x2",
        total: "89.97",
      },
      {
        userId: alice.id,
        orderNumber: "ORD-1002",
        status: "delivered",
        itemsSummary: "Mechanical Keyboard x1",
        total: "129.00",
      },
      {
        userId: bob.id,
        orderNumber: "ORD-2001",
        status: "cancelled",
        itemsSummary: "Smart Watch x1",
        total: "199.50",
      },
    ])
    .returning();

  await db.insert(deliveries).values([
    {
      orderId: order1.id,
      carrier: "FedEx",
      trackingNumber: "FX-88213-US",
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      lastUpdate: "Package left the regional facility and is on its way to your address.",
    },
    {
      orderId: order2.id,
      carrier: "UPS",
      trackingNumber: "UP-44120-US",
      estimatedDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lastUpdate: "Delivered to front door, signed by A. Johnson.",
    },
  ]);

  console.log("Seeding invoices + refunds...");
  const [invoice1, invoice2] = await db
    .insert(invoices)
    .values([
      {
        userId: alice.id,
        invoiceNumber: "INV-3001",
        status: "paid",
        amount: "49.99",
        subscriptionPlan: "Pro Monthly",
        dueAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        userId: alice.id,
        invoiceNumber: "INV-3002",
        status: "overdue",
        amount: "89.97",
        subscriptionPlan: null,
        dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ])
    .returning();

  await db.insert(refunds).values([
    {
      invoiceId: invoice1.id,
      status: "completed",
      amount: "49.99",
      reason: "Duplicate charge for the same billing cycle.",
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("Seeding a sample conversation...");
  const [conversation] = await db
    .insert(conversations)
    .values([{ userId: alice.id, title: "Order delivery question" }])
    .returning();

  await db.insert(messages).values([
    {
      conversationId: conversation.id,
      role: "user",
      content: "Hi, do you know when my headphones order will arrive?",
    },
    {
      conversationId: conversation.id,
      role: "assistant",
      agentType: "order",
      content:
        "Your order ORD-1001 (Wireless Headphones x1, USB-C Cable x2) is out for delivery via FedEx, tracking FX-88213-US, estimated within 2 days.",
    },
  ]);

  console.log("Seed complete. Demo users: alice@example.com / bob@example.com, password: password123");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
