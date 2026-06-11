import { erc20Abi } from 'viem'

export const UNICHAIN_SEPOLIA = {
  id: 1_301,
  name: 'Unichain Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC!],
    },
  },
  blockExplorers: {
    default: { name: 'Uniscan', url: 'https://sepolia.uniscan.xyz' },
  },
  testnet: true,
} as const

export const ILEX_HOOK_ADDRESS = (process.env.NEXT_PUBLIC_ILEX_HOOK_ADDR || '0x') as `0x${string}`
export const POOL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_POOL_MANAGER_ADDR || '0x') as `0x${string}`
export const MOCK_LENDING_POOL_ADDRESS = (process.env.NEXT_PUBLIC_LENDING_POOL_ADDR || '0x') as `0x${string}`
export const TOKEN0_ADDRESS = (process.env.NEXT_PUBLIC_POOL_TOKEN0_ADDR || '0x') as `0x${string}`
export const TOKEN1_ADDRESS = (process.env.NEXT_PUBLIC_POOL_TOKEN1_ADDR || '0x') as `0x${string}`

export const ILEX_HOOK_ABI = [
  {
    type: 'function',
    name: 'positions',
    inputs: [{ name: 'lp', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ILexHook.LPPosition',
        components: [
          {
            name: 'poolKey',
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
          },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'entrySqrtPriceX96', type: 'uint160' },
          { name: 'ilThresholdBps', type: 'uint256' },
          { name: 'reentryToleranceBps', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'depositTimestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPositionStatus',
    inputs: [{ name: 'lp', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentIL',
    inputs: [{ name: 'lp', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getParkedFunds',
    inputs: [{ name: 'lp', type: 'address' }],
    outputs: [
      { name: 'token0Deposited', type: 'uint256' },
      { name: 'token1Deposited', type: 'uint256' },
      { name: 'depositTimestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'estimateYieldAccrued',
    inputs: [{ name: 'lp', type: 'address' }],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'amount0Desired', type: 'uint256' },
      { name: 'amount1Desired', type: 'uint256' },
      { name: 'ilThresholdBps', type: 'uint256' },
      { name: 'reentryToleranceBps', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'manualExit',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'poolManager',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lendingPool',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'authorizedRvmId',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PositionCreated',
    inputs: [
      { name: 'lp', type: 'address', indexed: true },
      { name: 'entrySqrtPriceX96', type: 'uint160', indexed: false },
      { name: 'ilThresholdBps', type: 'uint256', indexed: false },
      { name: 'reentryToleranceBps', type: 'uint256', indexed: false },
      { name: 'tickLower', type: 'int24', indexed: false },
      { name: 'tickUpper', type: 'int24', indexed: false },
      { name: 'token0Amount', type: 'uint256', indexed: false },
      { name: 'token1Amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PositionExited',
    inputs: [
      { name: 'lp', type: 'address', indexed: true },
      { name: 'exitSqrtPriceX96', type: 'uint160', indexed: false },
      { name: 'ilAtExitBps', type: 'uint256', indexed: false },
      { name: 'token0Parked', type: 'uint256', indexed: false },
      { name: 'token1Parked', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PositionReentered',
    inputs: [
      { name: 'lp', type: 'address', indexed: true },
      { name: 'reentrySqrtPriceX96', type: 'uint160', indexed: false },
      { name: 'yieldEarned0', type: 'uint256', indexed: false },
      { name: 'yieldEarned1', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ManualExit',
    inputs: [
      { name: 'lp', type: 'address', indexed: true },
      { name: 'token0Returned', type: 'uint256', indexed: false },
      { name: 'token1Returned', type: 'uint256', indexed: false },
      { name: 'statusAtExit', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PriceUpdate',
    inputs: [
      { name: 'poolId', type: 'bytes32', indexed: true },
      { name: 'sqrtPriceX96', type: 'uint160', indexed: false },
      { name: 'tick', type: 'int24', indexed: false },
    ],
  },
] as const

export const POOL_MANAGER_ABI = [
  {
    type: 'function',
    name: 'slot0',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
    ],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint16' },
      { name: 'swapFee', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
] as const

export const MOCK_LENDING_POOL_ABI = [
  {
    type: 'function',
    name: 'getApy',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'apyBps', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supply',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'asset', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const erc20ABI = erc20Abi

export const POOL_KEY = {
  currency0: TOKEN0_ADDRESS,
  currency1: TOKEN1_ADDRESS,
  fee: 3000,
  tickSpacing: 60,
  hooks: ILEX_HOOK_ADDRESS,
} as const

export enum PositionStatus {
  NONE,
  ACTIVE,
  EXITING,
  EXITED,
  REENTERING,
}

export const STATUS_LABELS: Record<PositionStatus, string> = {
  [PositionStatus.NONE]: 'None',
  [PositionStatus.ACTIVE]: 'Active',
  [PositionStatus.EXITING]: 'Exiting',
  [PositionStatus.EXITED]: 'Parked',
  [PositionStatus.REENTERING]: 'Re-entering',
}

export const STATUS_COLORS: Record<PositionStatus, string> = {
  [PositionStatus.NONE]: 'bg-gray-500',
  [PositionStatus.ACTIVE]: 'bg-emerald-500',
  [PositionStatus.EXITING]: 'bg-amber-500',
  [PositionStatus.EXITED]: 'bg-blue-500',
  [PositionStatus.REENTERING]: 'bg-purple-500',
}
