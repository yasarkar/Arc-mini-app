/**
 * Logs a client-side error to the Next.js development server terminal.
 * Sends a POST request to `/api/log-error`.
 */
export async function logErrorToTerminal(error: any, context?: string) {
  try {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check if we are in a browser environment with a valid origin to prevent URL parsing errors during tests
    if (
      typeof window === "undefined" ||
      !window.location ||
      !window.location.origin ||
      (typeof process !== "undefined" && process.env.NODE_ENV === "test")
    ) {
      return;
    }

    // Send error details to Next.js API endpoint running on the server
    await fetch("/api/log-error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: errorMsg,
        stack: errorStack,
        context,
      }),
    });
  } catch (err) {
    console.error("Failed to log error to terminal:", err);
  }
}
