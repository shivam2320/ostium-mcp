import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Address } from "viem";

export enum LOG_LEVELS {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface Logger {
  debug(message: string, metadata?: object): void;
  info(message: string, metadata?: object): void;
  warning(message: string, metadata?: object): void;
  error(message: string, metadata?: object): void;
}

export interface McpConfig {
  name: string;
  version: string;
  hubBaseUrl?: string;
  userId?: string;
  service?: string;
  deploymentId?: string;
}

/**
 * Create a successful MCP tool response
 */
export const createSuccessResponse = (
  message: string,
  data?: any
): CallToolResult => ({
  content: [
    {
      type: "text",
      text: data
        ? `${message}\n\nData: ${JSON.stringify(
            data,
            (_, v) => (typeof v === "bigint" ? v.toString() : v),
            2
          )}`
        : message,
    },
  ],
});

/**
 * Create an error MCP tool response
 */
export const createErrorResponse = (
  error: string | Error | any,
  data?: any
): CallToolResult => ({
  content: [
    {
      type: "text",
      text: data
        ? `Error: ${
            error instanceof Error ? error.message : String(error)
          }\n\nDetails: ${JSON.stringify(data, null, 2)}`
        : `Error: ${error instanceof Error ? error.message : String(error)}`,
    },
  ],
});

/**
 * Create an authentication error response with optional custom message and auth details
 */
export const createAuthErrorResponse = (
  customMessage?: string,
  authDetails?: {
    authorizationUrl?: string;
    availableServices?: string[];
    missingService?: string;
    deploymentId?: string;
  }
): CallToolResult => {
  const defaultMessage =
    "Authentication required. Please ensure the MCP server is properly configured with authentication.";

  let message = customMessage || defaultMessage;

  if (authDetails) {
    message += "\n\nAuthentication Details:";

    if (authDetails.authorizationUrl) {
      message += `\n• Authorization URL: ${authDetails.authorizationUrl}`;
    }

    if (authDetails.missingService) {
      message += `\n• Missing Service: ${authDetails.missingService}`;
    }

    if (
      authDetails.availableServices &&
      authDetails.availableServices.length > 0
    ) {
      message += `\n• Available Services: ${authDetails.availableServices.join(
        ", "
      )}`;
    }

    if (authDetails.deploymentId) {
      message += `\n• Deployment ID: ${authDetails.deploymentId}`;
    }

    message +=
      "\n\n💡 Tip: Visit the authorization URL above to authenticate with the required service.";
  }

  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  };
};

/**
 * Create a validation error response
 */
export const createValidationErrorResponse = (
  field: string,
  message: string
): CallToolResult => ({
  content: [
    {
      type: "text",
      text: `Validation Error: ${field} - ${message}`,
    },
  ],
});

/**
 * Create a rate limit error response
 */
export const createRateLimitErrorResponse = (
  retryAfter?: string
): CallToolResult => ({
  content: [
    {
      type: "text",
      text: `Rate limit exceeded. ${
        retryAfter
          ? `Please wait ${retryAfter} seconds before retrying.`
          : "Please try again later."
      }`,
    },
  ],
});

/**
 * Create a service unavailable error response
 */
export const createServiceUnavailableResponse = (
  serviceName: string,
  estimatedTime?: string
): CallToolResult => ({
  content: [
    {
      type: "text",
      text: `${serviceName} service is temporarily unavailable. ${
        estimatedTime
          ? `Estimated recovery time: ${estimatedTime}.`
          : "Please try again in a few minutes."
      }`,
    },
  ],
});

/**
 * Create a permission denied error response
 */
export const createPermissionDeniedResponse = (
  action: string,
  requiredScopes?: string[]
): CallToolResult => {
  let message = `Permission denied: Unable to ${action}.`;

  if (requiredScopes && requiredScopes.length > 0) {
    message += `\n\nRequired permissions: ${requiredScopes.join(", ")}`;
    message +=
      "\n\n💡 Tip: You may need to re-authenticate with additional permissions.";
  }

  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  };
};

/**
 * Asset prices response data type
 */
export interface GetAssetPricesResponse {
  prices: Record<string, number>;
}

/**
 * Historical prices response data type
 */
export interface GetHistoricalPricesResponse {
  total: number;
  currency: string;
  timeFrame: string;
  timestamp_start: number;
  timestamp_end: number;
  results: string;
}

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: bigint;
}
