/**
 * Favicon Route - Returns empty response for favicon requests
 */

export const loader = async () => {
  // Return empty response for favicon requests
  return new Response(null, { status: 204 });
};



