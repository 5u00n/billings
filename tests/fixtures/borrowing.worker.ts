import { borrowingRouter } from "../../server/borrowing/router";
import { d1Store } from "../../server/borrowing/store";
// Isolated test Worker only. Production requests go through server/worker.ts authentication.
export default {
  async fetch(request: Request, env: any) {
    const result = await borrowingRouter(
      d1Store(env.DB),
      request.method,
      new URL(request.url),
      request.method === "POST" ? await request.json() : {},
      request.headers.get("Idempotency-Key") || "",
    );
    return Response.json(result?.data || {}, { status: result?.status || 404 });
  },
};
