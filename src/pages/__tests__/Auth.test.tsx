import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Auth from "../Auth";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => ({ data: { session: null } }) } }
}));

describe("Auth", () => {
  it("renders", () => {
    render(<BrowserRouter><Auth /></BrowserRouter>);
    expect(document.body).toBeTruthy();
  });
});
