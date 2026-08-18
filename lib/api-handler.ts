import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { AppError } from "@/lib/errors";

type RouteHandler<Context> = (
  req: NextRequest,
  context: Context
) => Promise<Response>;

export function withErrorHandling<Context>(
  handler: RouteHandler<Context>
): RouteHandler<Context> {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid input", issues: z.treeifyError(error) },
          { status: 400 }
        );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }
        if (error.code === "P2002") {
          return NextResponse.json(
            { error: "A record with these details already exists" },
            { status: 409 }
          );
        }
      }

      console.error(error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
