import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { App } from "./App";

describe("App auth shell", () => {
  it("renders login screen when no token", async () => {
    localStorage.removeItem("token");

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Войти в аккаунт")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
  });

  it("toggles password visibility button label", async () => {
    localStorage.removeItem("token");

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("button", { name: "Показать пароль" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Скрыть пароль" })).toBeInTheDocument();
  });

  it("clears token if /auth/me fails", async () => {
    localStorage.setItem("token", "BADTOKEN");

    const apiModule = await import("./api");
    vi.spyOn(apiModule.api, "me").mockRejectedValueOnce(new Error("Invalid token"));

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    // If token is cleared, auth shell remains visible.
    expect(await screen.findByText("Войти в аккаунт")).toBeInTheDocument();

    localStorage.removeItem("token");
  });
});

