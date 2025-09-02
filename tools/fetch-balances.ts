import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import { McpLogger } from "../utils/logger.js";
import {
  createErrorResponse,
  createSuccessResponse,
  LOG_LEVELS,
} from "../utils/types.js";
import { ERC20_ABI } from "../utils/ABIs/ERC20_ABI.js";
import { USDC_CONTRACT_ADDRESS } from "../utils/constants.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

async function fetchBalances(walletAddress: string): Promise<{
  ethBalance: string;
  usdcBalance: string;
  walletAddress: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider("https://mainnet.arbitrum.io");
    
    const ethBalanceWei = await provider.getBalance(walletAddress);
    const ethBalanceEth = ethers.formatEther(ethBalanceWei);
    
    const usdcContract = new ethers.Contract(
      USDC_CONTRACT_ADDRESS,
      ERC20_ABI,
      provider
    );
    
    const usdcBalanceRaw = await usdcContract.balanceOf(walletAddress);
    const usdcBalance = ethers.formatUnits(usdcBalanceRaw, 6);
    
    return {
      ethBalance: ethBalanceEth,
      usdcBalance: usdcBalance,
      walletAddress,
    };
  } catch (error) {
    logger.error("Failed to fetch balances", {
      walletAddress,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function registerFetchBalancesTools(server: McpServer): void {
  logger.info("💰 Registering fetch balances tools...");

  server.tool(
    "fetch_wallet_balances",
    "Retrieve ETH and USDC balances for a specified wallet address on Arbitrum network. Returns both native ETH balance and USDC token balance with proper decimal formatting.",
    {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "The wallet address to fetch balances for (must be a valid Ethereum address)",
        },
      },
      required: ["walletAddress"],
    },
    async ({ walletAddress }: { walletAddress: string }): Promise<CallToolResult> => {
      try {
        if (!ethers.isAddress(walletAddress)) {
          return createErrorResponse(
            "Invalid wallet address format. Please provide a valid Ethereum address."
          );
        }

        logger.toolCalled("fetch_wallet_balances", { walletAddress });

        const balances = await fetchBalances(walletAddress);
        
        const formattedBalances = {
          walletAddress: balances.walletAddress,
          balances: {
            ETH: {
              balance: parseFloat(balances.ethBalance).toFixed(6),
              unit: "ETH",
              network: "Arbitrum",
            },
            USDC: {
              balance: parseFloat(balances.usdcBalance).toFixed(2),
              unit: "USDC",
              network: "Arbitrum",
              contractAddress: USDC_CONTRACT_ADDRESS,
            },
          },
          lastUpdated: new Date().toISOString(),
        };

        logger.toolCompleted("fetch_wallet_balances");
        return createSuccessResponse(
          `✅ Retrieved balances for wallet ${walletAddress}`,
          formattedBalances
        );
      } catch (error) {
        return handleToolError("fetch_wallet_balances", error);
      }
    }
  );

  logger.info("✅ Fetch balances tools registered successfully");
}

function handleToolError(toolName: string, error: unknown): CallToolResult {
  logger.error("Balance tool execution failed", {
    tool: toolName,
    error: error instanceof Error ? error.message : String(error),
  });

  return createErrorResponse(error);
}
