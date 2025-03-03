/* eslint-disable camelcase */
import { createClerkClient } from "@clerk/nextjs/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { connectToDatabase } from "@/lib/database/mongoose";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function POST(req: Request) {
  try {
    console.log("Webhook endpoint called");
    
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("Missing WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Missing WEBHOOK_SECRET environment variable" },
        { status: 500 }
      );
    }

    // Get the headers
    const headersList = await headers();
    const svix_id = headersList.get("svix-id");
    const svix_timestamp = headersList.get("svix-timestamp");
    const svix_signature = headersList.get("svix-signature");

    console.log("Webhook headers:", { svix_id, svix_timestamp, svix_signature });

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing required Svix headers");
      return NextResponse.json(
        { error: "Missing required Svix headers" },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = await req.json();
      console.log("Webhook payload:", JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("Error parsing JSON payload:", err);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
      console.log("Webhook verification successful");
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;

    console.log(`Processing webhook event: ${eventType} for ID: ${id}`);

    try {
      // Ensure database connection
      console.log("Attempting database connection...");
      await connectToDatabase();
      console.log("Database connected successfully");

      // CREATE
      if (eventType === "user.created") {
        const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;
        console.log("Creating user with data:", { id, email: email_addresses[0].email_address, username, first_name, last_name });

        const user = {
          clerkId: id,
          email: email_addresses[0].email_address,
          username: username!,
          firstName: first_name || "",
          lastName: last_name || "",
          photo: image_url,
        };

        const newUser = await createUser(user);
        console.log("User created successfully:", newUser);

        // Set public metadata
        if (newUser) {
          try {
            await clerk.users.updateUser(id, {
              publicMetadata: {
                userId: newUser._id,
              },
            });
            console.log("Updated Clerk user metadata");
          } catch (error) {
            console.error("Error updating Clerk metadata:", error);
          }
        }

        return NextResponse.json({ message: "User created successfully", user: newUser });
      }

      // UPDATE
      if (eventType === "user.updated") {
        const { id, image_url, first_name, last_name, username } = evt.data;
        console.log("Updating user with data:", { id, username, first_name, last_name });

        const user = {
          firstName: first_name || "",
          lastName: last_name || "",
          username: username!,
          photo: image_url,
        };

        const updatedUser = await updateUser(id, user);
        console.log("User updated successfully:", updatedUser);

        return NextResponse.json({ message: "User updated successfully", user: updatedUser });
      }

      // DELETE
      if (eventType === "user.deleted") {
        const { id } = evt.data;
        console.log("Deleting user:", id);

        const deletedUser = await deleteUser(id!);
        console.log("User deleted successfully:", deletedUser);

        return NextResponse.json({ message: "User deleted successfully", user: deletedUser });
      }

      // Log unhandled event types
      console.log(`Unhandled webhook event type: ${eventType}`);
      return NextResponse.json({ message: "Webhook received", id, type: eventType });
      
    } catch (error) {
      console.error("Error processing webhook:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}