import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { asyncHandler } from "@/core/middleware/async-handler";
import { HttpContext } from "@/core/types/http-context.types";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { fromNodeHeaders } from "better-auth/node";


export const requireAuthMiddleware = asyncHandler(async (http: HttpContext) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(http.req.headers)
    })

    if(!session || !session.user) {
        throw new UnauthorizedError("Unauthorized.")
    }

    http.req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as Role
    }
    http.next()
})