export interface RawTransaction {
  blockTime: number;
  meta: Meta;
  slot: number;
  transaction: Transaction;
}

export interface Meta {
  err: unknown;
  fee: number;
  innerInstructions: InnerInstruction[];
  logMessages: string[];
  postBalances: number[];
  postTokenBalances: TokenBalance[];
  preBalances: number[];
  preTokenBalances: TokenBalance[];
  rewards: unknown[];
  status: Status;
}

export interface InnerInstruction {
  index: number;
  instructions: Instruction[];
}

export interface Instruction {
  parsed: Parsed;
  program: string;
  programId: string;
}

export interface Parsed {
  info: Info;
  type: string;
}

export interface Info {
  destination?: string;
  lamports?: number;
  source?: string;
  account?: string;
  space?: number;
  owner?: string;
  mint?: string;
  rentSysvar?: string;
}

export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  uiTokenAmount: UiTokenAmount;
}

export interface UiTokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}
export interface Status {
  Ok: unknown;
}

export interface Transaction {
  message: Message;
  signatures: string[];
}

export interface Message {
  accountKeys: AccountKey[];
  instructions: Instruction2[];
  recentBlockhash: string;
}

export interface AccountKey {
  pubkey: string;
  signer: boolean;
  writable: boolean;
}

export interface Instruction2 {
  accounts?: string[];
  data?: string;
  programId: string;
  parsed?: Parsed2;
  program?: string;
}

export interface Parsed2 {
  info: Info2;
  type: string;
}

export interface Info2 {
  authority?: string;
  destination?: string;
  mint: string;
  source: string;
  tokenAmount?: TokenAmount;
  account?: string;
  rentSysvar?: string;
  systemProgram?: string;
  tokenProgram?: string;
  wallet?: string;
}

export interface TokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}
