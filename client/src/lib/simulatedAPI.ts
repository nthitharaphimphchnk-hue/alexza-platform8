/**
 * Simulated API Response Generator
 * Generates realistic responses with delays and occasional failures
 */

interface SimulatedResponse {
  content: string;
  delay: number;
  isError: boolean;
  errorMessage?: string;
}

// Mock response templates
const MOCK_RESPONSES = [
  "I've analyzed your request and here are my recommendations...",
  "Based on the provided information, I suggest the following approach...",
  "Let me break this down into actionable steps for you...",
  "I understand your needs. Here's what I recommend...",
  "That's an interesting question. Consider these options...",
  "I've processed your input. Here's my analysis...",
  "Great question! Let me provide some insights...",
  "I've reviewed your request. Here's my response...",
];

const ERROR_MESSAGES = [
  "Oops! Something went wrong processing your request.",
  "I encountered an error while analyzing your input.",
  "Unable to process at this moment. Please try again.",
  "An unexpected error occurred. Please retry.",
  "I couldn't complete this request. Try again later.",
];

/**
 * Generate random delay between 600-1800ms
 */
function getRandomDelay(): number {
  return Math.floor(Math.random() * 1200) + 600; // 600-1800ms
}

/**
 * Determine if response should fail (10% chance)
 */
function shouldFail(): boolean {
  return Math.random() < 0.1; // 10% failure rate
}

/**
 * Get random mock response
 */
function getRandomResponse(): string {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

/**
 * Get random error message
 */
function getRandomError(): string {
  return ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
}

/**
 * Generate simulated API response
 */
export function generateSimulatedResponse(): SimulatedResponse {
  const delay = getRandomDelay();
  const isError = shouldFail();

  if (isError) {
    return {
      content: '',
      delay,
      isError: true,
      errorMessage: getRandomError(),
    };
  }

  return {
    content: getRandomResponse(),
    delay,
    isError: false,
  };
}

/**
 * Simulate API call with delay
 */
export async function simulateAPICall(): Promise<SimulatedResponse> {
  const response = generateSimulatedResponse();
  await new Promise((resolve) => setTimeout(resolve, response.delay));
  return response;
}

/**
 * Get delay for UI display (in seconds)
 */
export function formatDelay(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
