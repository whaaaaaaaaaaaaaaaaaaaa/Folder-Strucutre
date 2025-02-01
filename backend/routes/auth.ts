import { Router } from "https://deno.land/x/oak/mod.ts";

const router = new Router();

router.post("/login", async (ctx) => {
  const body = await ctx.request.body().value;
  const receivedPassword = body.password;
  const expectedPassword = "Sophie123456@";

  console.log("Login attempt:", {
    receivedPassword,
    expectedPassword,
    matches: receivedPassword === expectedPassword,
  });

  if (receivedPassword === expectedPassword) {
    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } else {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Invalid password" };
  }
});

export { router as authRouter };
