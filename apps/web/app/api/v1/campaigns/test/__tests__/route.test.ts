import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock auth
const authMock = vi.hoisted(() => ({
  api: { getSession: vi.fn() },
}));

vi.mock("@reachdem/auth", () => ({
  auth: authMock,
}));

// Mock render-email
vi.mock("@/lib/render-email", () => ({
  wrapContentInEmailStructure: vi.fn((content) => `<html>${content}</html>`),
}));

// Mock EnqueueEmailUseCase
const mockEnqueueEmailUseCase = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@reachdem/core", () => ({
  EnqueueEmailUseCase: mockEnqueueEmailUseCase,
}));

// Mock publishEmailJob
const mockPublishEmailJob = vi.hoisted(() => vi.fn());
vi.mock("@/lib/publish-email-job", () => ({
  publishEmailJob: mockPublishEmailJob,
}));

describe("POST /api/v1/campaigns/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    authMock.api.getSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if workspace is not selected", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: "test@example.com" },
      session: { activeOrganizationId: null },
    });

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Workspace required");
  });

  it("should return 400 if user email is not found", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: null },
      session: { activeOrganizationId: "org123" },
    });

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("User email not found");
  });

  it("should return 400 if request body is invalid", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: "test@example.com" },
      session: { activeOrganizationId: "org123" },
    });

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "", // Empty subject
        htmlContent: "<p>Test content</p>",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid payload");
  });

  it("should send test email successfully with default sender name", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: "test@example.com" },
      session: { activeOrganizationId: "org123" },
    });

    mockEnqueueEmailUseCase.execute.mockResolvedValue({
      message_id: "msg_123",
      status: "queued",
      correlation_id: "corr_123",
      idempotent: false,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
        fontFamily: "Arial",
        fontWeights: [400, 700],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("test@example.com");
    expect(data.messageId).toBe("msg_123");
    expect(data.status).toBe("queued");
    expect(data.correlationId).toBe("corr_123");

    // Verify EnqueueEmailUseCase was called correctly
    expect(mockEnqueueEmailUseCase.execute).toHaveBeenCalledWith(
      "org123",
      expect.objectContaining({
        to: "test@example.com",
        subject: "[TEST] Test Subject",
        html: expect.stringContaining("<html>"),
        from: expect.any(String),
        idempotency_key: expect.stringContaining("test-"),
      }),
      mockPublishEmailJob
    );
  });

  it("should send test email with custom sender name", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: "test@example.com" },
      session: { activeOrganizationId: "org123" },
    });

    mockEnqueueEmailUseCase.execute.mockResolvedValue({
      message_id: "msg_123",
      status: "queued",
      correlation_id: "corr_123",
      idempotent: false,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
        fromName: "Custom Sender",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify custom sender name was used
    expect(mockEnqueueEmailUseCase.execute).toHaveBeenCalledWith(
      "org123",
      expect.objectContaining({
        from: "Custom Sender",
      }),
      mockPublishEmailJob
    );
  });

  it("should handle EnqueueEmailUseCase errors", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: "test@example.com" },
      session: { activeOrganizationId: "org123" },
    });

    mockEnqueueEmailUseCase.execute.mockRejectedValue(
      new Error("Database connection failed")
    );

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });

  it("should use default font settings if not provided", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: "user123", email: "test@example.com" },
      session: { activeOrganizationId: "org123" },
    });

    mockEnqueueEmailUseCase.execute.mockResolvedValue({
      message_id: "msg_123",
      status: "queued",
      correlation_id: "corr_123",
      idempotent: false,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/campaigns/test", {
      method: "POST",
      body: JSON.stringify({
        subject: "Test Subject",
        htmlContent: "<p>Test content</p>",
        // No fontFamily or fontWeights provided
      }),
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
  });
});
