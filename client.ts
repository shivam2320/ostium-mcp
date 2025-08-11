import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHelloTool } from "./tools/hello-world.js";
import { registerHelloPrompt } from "./prompts/hello-world.js";
import { registerHelloResource } from "./resources/hello-world.js";

import {
  createWalletClient,
  http,
  createPublicClient,
  PublicClient,
  getContract,
  serializeTransaction,
  Address,
  encodeFunctionData,
  parseUnits,
} from "viem";
import { arbitrum, mainnet } from "viem/chains";
import { getAuthContext } from "@osiris-ai/sdk";
import { EVMWalletClient } from "@osiris-ai/web3-evm-sdk";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  createSuccessResponse,
  createErrorResponse,
  TokenInfo,
} from "./utils/types.js";
import { ERC20_ABI } from "./utils/ABIs/ERC20_ABI.js";
import { TRADING_CONTRACT_ADDRESS } from "./utils/constants.js";
import { z } from "zod";

export class OstiumMCP {
  private hubBaseUrl: string;
  publicClient: PublicClient;
  walletToSession: Record<string, string> = {};
  chain: string;

  constructor(hubBaseUrl: string) {
    this.hubBaseUrl = hubBaseUrl;
    this.publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });
    this.chain = "evm:eip155:42161";
  }

  async getUserAddresses(): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );
      const walletRecords = await client.getWalletRecords();
      if (walletRecords.length === 0) {
        throw new Error("No wallet record found");
      }

      const addresses = walletRecords.map((walletRecord) =>
        walletRecord.accounts.addresses.map((address) => ({
          chains: address.chains,
          address: address.address,
        }))
      );
      return createSuccessResponse("Successfully got user addresses", {
        addresses,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to get user addresses";
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * Choose wallet for current session
   */
  async chooseWallet(address: string): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );
      const walletRecords = await client.getWalletRecords();
      if (walletRecords.length === 0) {
        throw new Error("No wallet record found");
      }
      const walletRecord = walletRecords.find((walletRecord) =>
        walletRecord.accounts.addresses.some(
          (_address) => _address.address.toLowerCase() === address.toLowerCase()
        )
      );
      if (!walletRecord) {
        throw new Error("Wallet record not found");
      }
      this.walletToSession[context.sessionId] = address;

      return createSuccessResponse("Successfully chose wallet", {
        walletRecordId: walletRecord.id,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to choose wallet";
      return createErrorResponse(errorMessage);
    }
  }

  async getTokenInfo(tokenAddress: Address): Promise<TokenInfo> {
    try {
      const tokenContract = getContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        client: this.publicClient,
      });

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.read.name(),
        tokenContract.read.symbol(),
        tokenContract.read.decimals(),
        tokenContract.read.totalSupply(),
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply,
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`);
    }
  }

  async approveToken(
    tokenAddress: Address,
    amount: bigint
  ): Promise<CallToolResult> {
    const { token, context } = getAuthContext("osiris");
    if (!token || !context) {
      throw new Error("No token or context found");
    }

    const wallet = this.walletToSession[context.sessionId];
    if (!wallet) {
      const error = new Error(
        "No wallet found, you need to choose a wallet first with chooseWallet"
      );
      error.name = "NoWalletFoundError";
      return createErrorResponse(error);
    }
    const client = new EVMWalletClient(
      this.hubBaseUrl,
      token.access_token,
      context.deploymentId
    );

    const account = await client.getViemAccount(wallet, this.chain);

    if (!account) {
      const error = new Error(
        "No account found, you need to choose a wallet first with chooseWallet"
      );
      error.name = "NoAccountFoundError";
      return createErrorResponse(error);
    }

    try {
      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const tokenInInfo = await this.getTokenInfo(tokenAddress);
      const amountInWei = parseUnits(amount.toString(), tokenInInfo.decimals);

      const preparedTx = await this.publicClient.prepareTransactionRequest({
        chain: mainnet,
        account: account,
        to: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TRADING_CONTRACT_ADDRESS, amountInWei],
        gas: 800000n,
      });
      console.log(
        JSON.stringify(
          {
            chain: mainnet,
            account: account,
            to: tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [TRADING_CONTRACT_ADDRESS, amountInWei],
            gas: 8000000n,
          },
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2
        )
      );
      console.log(
        JSON.stringify(
          preparedTx,
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2
        )
      );
      const serializedTx = serializeTransaction({
        ...preparedTx,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [TRADING_CONTRACT_ADDRESS, amountInWei],
        }),
      } as any);

      const signedTx = await client.signTransaction(
        ERC20_ABI,
        serializedTx,
        this.chain,
        account.address
      );

      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully approved token", {
        hash: hash,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      const errorMessage = error.message || "Failed to approve token";
      return createErrorResponse(errorMessage);
    }
  }

  configureServer(server: McpServer): void {
    registerHelloTool(server);
    registerHelloPrompt(server);
    registerHelloResource(server);
    server.tool(
      "getUserAddresses",
      "Get user addresses, you can choose a wallet with chooseWallet",
      {},
      async () => {
        const addresses = await this.getUserAddresses();
        return addresses;
      }
    );
    server.tool(
      "chooseWallet",
      "Choose a wallet, you can get user addresses with getUserAddresses",
      {
        address: z.string(),
      },
      async ({ address }) => {
        const wallet = await this.chooseWallet(address as Address);
        return wallet;
      }
    );
    server.tool(
      "approveToken",
      "Approve token spending",
      {
        tokenAddress: z.string(),
        amount: z.string(),
      },
      async ({ tokenAddress, amount }) => {
        const allowance = await this.approveToken(
          tokenAddress as Address,
          BigInt(amount)
        );
        return allowance;
      }
    );
  }
}
