import{describe,it,expect}from"vitest";import{RateLimiter}from"../rateLimiter";describe("rateLimiter",()=>{it("creates instance",()=>{const rl=new RateLimiter(10,1000);expect(rl).toBeDefined();});});
