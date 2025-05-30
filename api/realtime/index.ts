// Simple Edge API handler
export const config = {
  runtime: 'edge'
};

export default function handler(request) {
  // For non-WebSocket requests, return a simple message
  return new Response("WebSocket endpoint for talking objects audio API", {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
