import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
	erc20Abi,
} from "viem";
import { arbitrum } from "viem/chains";
import { getAuthContext, AuthManager } from "@osiris-ai/sdk";
import { EVMWalletClient } from "@osiris-ai/web3-evm-sdk";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
	createSuccessResponse,
	createErrorResponse,
	TokenInfo,
} from "./utils/types.js";
import { ERC20_ABI } from "./utils/ABIs/ERC20_ABI.js";
import { TRADING_ABI } from "./utils/ABIs/TRADING_ABI.js";
import {
	STORAGE_CONTRACT_ADDRESS,
	TRADING_CONTRACT_ADDRESS,
	USDC_CONTRACT_ADDRESS,
} from "./utils/constants.js";
import { z } from "zod";
import { registerOpenTradeTools } from "./tools/open-trade.js";
import { registerCloseTradeTools } from "./tools/close-trade.js";
import { registerUpdateTpTools } from "./tools/update-tp.js";
import { registerUpdateSlTools } from "./tools/update-sl.js";
import { registerModifyTradeTools } from "./tools/modify-trade.js";
import { registerDataTools } from "./tools/data.js";
import { registerFetchPricesTools } from "./tools/fetch-prices.js";
import { registerFetchBalancesTools } from "./tools/fetch-balances.js";
import {
	OpenTradeParams,
	CloseTradeParams,
	UpdateTpParams,
	UpdateSlParams,
	ModifyTradeParams,
	WithdrawParams,
} from "./schema/index.js";
import { findPairIndex } from "./utils/pairs.js";
import { getCurrentMidPrice } from "./utils/price-fetcher.js";
import { registerWithdrawTools } from "./tools/withdraw.js";

export class OstiumMCP {
	public hubBaseUrl: string;
	publicClient: PublicClient;
	walletToSession: Record<string, string> = {};
	chain: string;
	authManager: AuthManager;

	constructor(hubBaseUrl: string, a: AuthManager) {
		this.hubBaseUrl = hubBaseUrl;
		this.publicClient = createPublicClient({
			chain: arbitrum,
			transport: http(),
		});
		this.chain = "evm:eip155:42161";
		this.authManager = a;
	}

	/**
	 * Helper function to refresh tokens and update both database and AsyncLocalStorage context
	 */
	private async refreshTokensAndUpdateContext(token: any, context: any): Promise<any> {
		const refreshToken = token?.refresh_token;
		if (!refreshToken) {
			throw new Error("No refresh token available");
		}

		const newToken = await this.authManager.refreshToken('osiris', refreshToken);
		if (!newToken) {
			throw new Error("Failed to refresh token");
		}

		// Update database
		await this.authManager.updateAuthentication(context.deploymentId, 'osiris', {
			token: {
				...token,
				access_token: newToken.access_token,
				refresh_token: newToken.refresh_token,
				expires_in: newToken.expires_in,
			},
		});

		// Update AsyncLocalStorage context
		const updatedToken = {
			...token,
			access_token: newToken.access_token,
			refresh_token: newToken.refresh_token,
			expires_in: newToken.expires_in,
		};
		context.tokens.set('osiris', updatedToken);

		return updatedToken;
	}

	/**
	 * Public method for tools to refresh tokens
	 */
	async refreshTokensForTools(): Promise<void> {
		const { token, context } = getAuthContext("osiris");
		await this.refreshTokensAndUpdateContext(token, context);
	}

	async getUserAddresses(retry = false): Promise<CallToolResult> {
		const { token, context } = getAuthContext("osiris");
		try {
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
			if (retry) {
				throw new Error("Failed to get signature from Action API, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.getUserAddresses(true);
			} catch (refreshError: any) {
				const errorMessage = refreshError.message || "Failed to get user addresses, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	/**
	 * Choose wallet for current session
	 */
	async chooseWallet(address: string, retry = false): Promise<CallToolResult> {
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
			if (retry) {
				throw new Error("Failed to choose wallet, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.chooseWallet(address, true);
			} catch (refreshError: any) {
				const errorMessage = refreshError.message || "Failed to choose wallet, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
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

	async getTokenAllowance(tokenAddress: Address, retry = false): Promise<CallToolResult> {
		try {
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

			const tokenContract = getContract({
				address: tokenAddress,
				abi: ERC20_ABI,
				client: this.publicClient,
			});

			const allowance = await tokenContract.read.allowance([
				account.address,
				STORAGE_CONTRACT_ADDRESS,
			]);

			return createSuccessResponse("Successfully got token allowance", {
				allowance: allowance,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to get token allowance, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.getTokenAllowance(tokenAddress, true);
			} catch (refreshError: any) {
				const errorMessage = refreshError.message || "Failed to get token allowance, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async approveToken(amount: bigint, retry = false): Promise<CallToolResult> {
		try {
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
			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			let tokenAddress = USDC_CONTRACT_ADDRESS as Address;

			const tokenInInfo = await this.getTokenInfo(tokenAddress);
			const amountInWei = parseUnits(amount.toString(), tokenInInfo.decimals);

			const preparedTx = await this.publicClient.prepareTransactionRequest({
				chain: arbitrum,
				account: account,
				to: tokenAddress,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [STORAGE_CONTRACT_ADDRESS, amountInWei],
				gas: 800000n,
			});
			console.log(
				JSON.stringify(
					{
						chain: arbitrum,
						account: account,
						to: tokenAddress,
						abi: ERC20_ABI,
						functionName: "approve",
						args: [STORAGE_CONTRACT_ADDRESS, amountInWei],
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
					args: [STORAGE_CONTRACT_ADDRESS, amountInWei],
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

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully approved token", {
				hash: hash,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to approve token, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.approveToken(amount, true);
			} catch (refreshError: any) {
				if (error.response && error.response.data && error.response.data.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to approve token, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async openTrade(params: OpenTradeParams, retry = false): Promise<CallToolResult> {
		try {
			const { token, context } = getAuthContext("osiris");
			if (!token || !context) {
				throw new Error("No token or context found");
			}
			console.log(
				JSON.stringify(
					{
						hubBaseUrl: this.hubBaseUrl,
						accessToken: token.access_token,
						deploymentId: context.deploymentId,
					},
					null,
					2
				)
			);

			const wallet = this.walletToSession[context.sessionId];
			if (!wallet) {
				throw new Error(
					"No wallet found, you need to choose a wallet first with chooseWallet"
				);
			}

			const client = new EVMWalletClient(
				this.hubBaseUrl,
				token.access_token,
				context.deploymentId
			);

			const account = await client.getViemAccount(wallet, this.chain);
			if (!account) {
				throw new Error(
					"No account found, you need to choose a wallet first with chooseWallet"
				);
			}

			const { _trade, _type, _slippage } = params;

			let pairIndex: number;
			try {
				pairIndex = findPairIndex(_trade.from, _trade.to || "USD");
			} catch (error) {
				throw new Error(
					`Invalid trading pair: ${_trade.from}/${_trade.to || "USD"}. ${error instanceof Error ? error.message : String(error)
					}`
				);
			}

			// Auto-fetch current market price if not provided
			let openPrice: string;
			if (_trade.openPrice) {
				openPrice = _trade.openPrice;
			} else {
				try {
					console.log(
						`Auto-fetching current market price for ${_trade.from}/${_trade.to || "USD"
						}...`
					);
					openPrice = await getCurrentMidPrice(_trade.from, _trade.to || "USD");
					console.log(`Using current mid price: ${openPrice}`);
				} catch (error) {
					throw new Error(
						`Failed to fetch current market price for ${_trade.from}/${_trade.to || "USD"
						}: ${error instanceof Error ? error.message : String(error)}`
					);
				}
			}

			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			const tradeArray = {
				collateral: parseUnits(_trade.collateral, 6),
				openPrice: parseUnits(openPrice, 18),
				tp: parseUnits(_trade.tp, 18),
				sl: parseUnits(_trade.sl, 18),
				trader: _trade.trader as `0x${string}`,
				leverage: Math.round(Number(_trade.leverage) * 100),
				pairIndex: pairIndex,
				index: Number(_trade.index ?? "0"),
				buy: _trade.buy ?? true,
			};

			const preparedTx = await walletClient.prepareTransactionRequest({
				to: TRADING_CONTRACT_ADDRESS,
				abi: TRADING_ABI,
				functionName: "openTrade",
				args: [tradeArray, _type, _slippage],
				gas: 800000n,
			});

			const serializedTx = serializeTransaction({
				...preparedTx,
				data: encodeFunctionData({
					abi: TRADING_ABI,
					functionName: "openTrade",
					args: [tradeArray, _type, _slippage],
				}),
			} as any);

			const signedTx = await client.signTransaction(
				TRADING_ABI,
				serializedTx,
				this.chain,
				account.address
			);
			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: signedTx as `0x${string}`,
			});

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully opened trade", {
				hash: hash,
				trade: _trade,
				type: _type,
				slippage: _slippage,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to open trade, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.openTrade(params, true);
			} catch (refreshError: any) {
				if (error.response?.data?.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to open trade, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async withdraw(params: WithdrawParams, retry = false): Promise<CallToolResult> {

		try {
			const { token, context } = getAuthContext("osiris");
			if (!token || !context) {
				throw new Error("No token or context found");
			}

			const wallet = this.walletToSession[context.sessionId];
			if (!wallet) {
				throw new Error(
					"No wallet found, you need to choose a wallet first with chooseWallet"
				);
			}

			const client = new EVMWalletClient(
				this.hubBaseUrl,
				token.access_token,
				context.deploymentId
			);

			const account = await client.getViemAccount(wallet, this.chain);
			if (!account) {
				throw new Error(
					"No account found, you need to choose a wallet first with chooseWallet"
				);
			}

			const { amount, address } = params;

			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			let serializedTransaction: any;

			if (params.token === "USDC") {
				const preparedTx = await walletClient.prepareTransactionRequest({
					to: USDC_CONTRACT_ADDRESS,
					abi: erc20Abi,
					functionName: "transfer",
					args: [address, parseUnits(amount, 6)],
					gas: 800000n,
				});
				serializedTransaction = serializeTransaction({
					...preparedTx,
					data: encodeFunctionData({
						abi: erc20Abi,
						functionName: "transfer",
						args: [address as `0x${string}`, parseUnits(amount, 6)],
					}),
				} as any);
			} else if (params.token === "ETH") {
				const preparedTx = await walletClient.prepareTransactionRequest({
					to: address as `0x${string}`,
					value: parseUnits(amount, 18),
					gas: 800000n,
				});
				serializedTransaction = serializeTransaction({
					...preparedTx,
				} as any);
			}
			
			const signedTx = await client.signTransaction(
				erc20Abi,
				serializedTransaction,
				this.chain,
				account.address
			);
			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: signedTx as `0x${string}`,
			});

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully withdrew token", {
				hash: hash,
				amount: amount,
				token: params.token,
				address: address,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to withdraw token, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.withdraw(params, true);
			} catch (refreshError: any) {
				if (error.response?.data?.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to withdraw token, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async closeTrade(params: CloseTradeParams, retry = false): Promise<CallToolResult> {
		try {
			const { token, context } = getAuthContext("osiris");
			if (!token || !context) {
				throw new Error("No token or context found");
			}

			const wallet = this.walletToSession[context.sessionId];
			if (!wallet) {
				throw new Error(
					"No wallet found, you need to choose a wallet first with chooseWallet"
				);
			}

			const client = new EVMWalletClient(
				this.hubBaseUrl,
				token.access_token,
				context.deploymentId
			);

			const account = await client.getViemAccount(wallet, this.chain);
			if (!account) {
				return createErrorResponse(
					"No account found, you need to choose a wallet first with chooseWallet"
				);
			}

			const { from, to, _index, _closePercentage } = params;

			let pairIndex: number;
			try {
				pairIndex = findPairIndex(from, to || "USD");
			} catch (error) {
				return createErrorResponse(
					`Invalid trading pair: ${from}/${to || "USD"}. ${error instanceof Error ? error.message : String(error)
					}`
				);
			}

			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			const preparedTx = await walletClient.prepareTransactionRequest({
				to: TRADING_CONTRACT_ADDRESS,
				abi: TRADING_ABI,
				functionName: "closeTradeMarket",
				args: [
					pairIndex,
					Number(_index ?? "0"),
					parseUnits(_closePercentage, 2),
				],
				gas: 800000n,
			});

			const serializedTx = serializeTransaction({
				...preparedTx,
				data: encodeFunctionData({
					abi: TRADING_ABI,
					functionName: "closeTradeMarket",
					args: [
						pairIndex,
						Number(_index ?? "0"),
						parseUnits(_closePercentage, 2),
					],
				}),
			} as any);
			const signedTx = await client.signTransaction(
				TRADING_ABI,
				serializedTx,
				this.chain,
				account.address
			);
			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: signedTx as `0x${string}`,
			});

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully closed trade", {
				hash: hash,
				from: from,
				to: to || "USD",
				pairIndex: pairIndex,
				index: _index,
				closePercentage: _closePercentage,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to close trade, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.closeTrade(params, true);
			} catch (refreshError: any) {
				if (error.response?.data?.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to close trade, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async updateTp(params: UpdateTpParams, retry = false): Promise<CallToolResult> {
		try {
			const { token, context } = getAuthContext("osiris");
			if (!token || !context) {
				throw new Error("No token or context found");
			}

			const wallet = this.walletToSession[context.sessionId];
			if (!wallet) {
				throw new Error(
					"No wallet found, you need to choose a wallet first with chooseWallet"
				);
			}

			const client = new EVMWalletClient(
				this.hubBaseUrl,
				token.access_token,
				context.deploymentId
			);

			const account = await client.getViemAccount(wallet, this.chain);
			if (!account) {
				throw new Error(
					"No account found, you need to choose a wallet first with chooseWallet"
				);
			}

			const { from, to, _index, _newTP } = params;

			let pairIndex: number;
			try {
				pairIndex = findPairIndex(from, to || "USD");
			} catch (error) {
				throw new Error(
					`Invalid trading pair: ${from}/${to || "USD"}. ${error instanceof Error ? error.message : String(error)
					}`
				);
			}

			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			const preparedTx = await walletClient.prepareTransactionRequest({
				to: TRADING_CONTRACT_ADDRESS,
				abi: TRADING_ABI,
				functionName: "updateTp",
				args: [pairIndex, Number(_index ?? "0"), parseUnits(_newTP, 18)],
				gas: 800000n,
			});

			const serializedTx = serializeTransaction({
				...preparedTx,
				data: encodeFunctionData({
					abi: TRADING_ABI,
					functionName: "updateTp",
					args: [pairIndex, Number(_index ?? "0"), parseUnits(_newTP, 18)],
				}),
			} as any);
			const signedTx = await client.signTransaction(
				TRADING_ABI,
				serializedTx,
				this.chain,
				account.address
			);
			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: signedTx as `0x${string}`,
			});

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully updated TP", {
				hash: hash,
				from: from,
				to: to || "USD",
				pairIndex: pairIndex,
				index: _index,
				newTP: _newTP,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to update TP, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.updateTp(params, true);
			} catch (refreshError: any) {
				if (error.response?.data?.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to update TP, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async updateSl(params: UpdateSlParams, retry = false): Promise<CallToolResult> {
		try {
			const { token, context } = getAuthContext("osiris");
			if (!token || !context) {
				throw new Error("No token or context found");
			}

			const wallet = this.walletToSession[context.sessionId];
			if (!wallet) {
				throw new Error(
					"No wallet found, you need to choose a wallet first with chooseWallet"
				);
			}

			const client = new EVMWalletClient(
				this.hubBaseUrl,
				token.access_token,
				context.deploymentId
			);

			const account = await client.getViemAccount(wallet, this.chain);
			if (!account) {
				throw new Error(
					"No account found, you need to choose a wallet first with chooseWallet"
				);
			}

			const { from, to, _index, _newSL } = params;

			let pairIndex: number;
			try {
				pairIndex = findPairIndex(from, to || "USD");
			} catch (error) {
				throw new Error(
					`Invalid trading pair: ${from}/${to || "USD"}. ${error instanceof Error ? error.message : String(error)
					}`
				);
			}

			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			const preparedTx = await walletClient.prepareTransactionRequest({
				to: TRADING_CONTRACT_ADDRESS,
				abi: TRADING_ABI,
				functionName: "updateSl",
				args: [pairIndex, Number(_index ?? "0"), parseUnits(_newSL, 18)],
				gas: 800000n,
			});

			const serializedTx = serializeTransaction({
				...preparedTx,
				data: encodeFunctionData({
					abi: TRADING_ABI,
					functionName: "updateSl",
					args: [pairIndex, Number(_index ?? "0"), parseUnits(_newSL, 18)],
				}),
			} as any);
			const signedTx = await client.signTransaction(
				TRADING_ABI,
				serializedTx,
				this.chain,
				account.address
			);
			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: signedTx as `0x${string}`,
			});

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully updated SL", {
				hash: hash,
				from: from,
				to: to || "USD",
				pairIndex: pairIndex,
				index: _index,
				newSL: _newSL,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to update SL, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.updateSl(params, true);
			} catch (refreshError: any) {
				if (error.response?.data?.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to update SL, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	async modifyTrade(params: ModifyTradeParams, retry = false): Promise<CallToolResult> {
		try {
			const { token, context } = getAuthContext("osiris");
			if (!token || !context) {
				throw new Error("No token or context found");
			}

			const wallet = this.walletToSession[context.sessionId];
			if (!wallet) {
				throw new Error(
					"No wallet found, you need to choose a wallet first with chooseWallet"
				);
			}

			const client = new EVMWalletClient(
				this.hubBaseUrl,
				token.access_token,
				context.deploymentId
			);

			const account = await client.getViemAccount(wallet, this.chain);
			if (!account) {
				throw new Error(
					"No account found, you need to choose a wallet first with chooseWallet"
				);
			}

			const { from, to, _index, _amount } = params;

			let pairIndex: number;
			try {
				pairIndex = findPairIndex(from, to || "USD");
			} catch (error) {
				throw new Error(
					`Invalid trading pair: ${from}/${to || "USD"}. ${error instanceof Error ? error.message : String(error)
					}`
				);
			}

			const walletClient = createWalletClient({
				account: account,
				chain: arbitrum,
				transport: http(),
			});

			const preparedTx = await walletClient.prepareTransactionRequest({
				to: TRADING_CONTRACT_ADDRESS,
				abi: TRADING_ABI,
				functionName: "topUpCollateral",
				args: [pairIndex, Number(_index ?? "0"), parseUnits(_amount, 6)],
				gas: 800000n,
			});

			const serializedTx = serializeTransaction({
				...preparedTx,
				data: encodeFunctionData({
					abi: TRADING_ABI,
					functionName: "topUpCollateral",
					args: [pairIndex, Number(_index ?? "0"), parseUnits(_amount, 6)],
				}),
			} as any);
			const signedTx = await client.signTransaction(
				TRADING_ABI,
				serializedTx,
				this.chain,
				account.address
			);
			const hash = await walletClient.sendRawTransaction({
				serializedTransaction: signedTx as `0x${string}`,
			});

			const receipt = await this.publicClient.waitForTransactionReceipt({
				hash: hash,
			});

			if (receipt.status !== "success") {
				throw new Error(`Transaction failed with status: ${receipt.status}`);
			}

			return createSuccessResponse("Successfully modified trade", {
				hash: hash,
				from: from,
				to: to || "USD",
				pairIndex: pairIndex,
				index: _index,
				amount: _amount,
				receipt: receipt,
			});
		} catch (error: any) {
			if (retry) {
				throw new Error("Failed to modify trade, and failed to refresh token, reauthenticate with this MCP");
			}
			try {
				const { token, context } = getAuthContext("osiris");
				await this.refreshTokensAndUpdateContext(token, context);
				return await this.modifyTrade(params, true);
			} catch (refreshError: any) {
				if (error.response?.data?.error) {
					return createErrorResponse(error.response.data.error);
				}
				const errorMessage = refreshError.message || "Failed to modify trade, and failed to refresh token, reauthenticate with this MCP";
				return createErrorResponse(new Error(errorMessage));
			}
		}
	}

	configureServer(server: McpServer): void {
		registerHelloPrompt(server);
		registerHelloResource(server);
		registerOpenTradeTools(server, this);
		registerCloseTradeTools(server, this);
		registerUpdateTpTools(server, this);
		registerUpdateSlTools(server, this);
		registerModifyTradeTools(server, this);
		registerDataTools(server);
		registerFetchPricesTools(server);
		registerFetchBalancesTools(server, this);
		registerWithdrawTools(server, this);
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
				amount: z.string(),
			},
			async ({ amount }) => {
				const allowance = await this.approveToken(BigInt(amount));
				return allowance;
			}
		);
		server.tool(
			"getTokenAllowance",
			"Get token allowance",
			{
				tokenAddress: z.string(),
			},
			async ({ tokenAddress }) => {
				const allowance = await this.getTokenAllowance(tokenAddress as Address);
				return allowance;
			}
		);
	}
}
