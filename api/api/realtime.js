export const config = {
  runtime: 'edge'
};

export default function handler(request) {
  return new Response("WebSocket endpoint for talking objects audio API", {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
} 