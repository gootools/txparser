interface RawTransaction {
  blockTime: number;
  meta: Meta;
  slot: number;
  transaction: Transaction;
}

interface Meta {
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

interface InnerInstruction {
  index: number;
  instructions: Instruction[];
}

interface Instruction {
  parsed: Parsed;
  program: string;
  programId: string;
}

interface Parsed {
  info: Info;
  type: string;
}

interface Info {
  destination?: string;
  lamports?: number;
  source?: string;
  account?: string;
  space?: number;
  owner?: string;
  mint?: string;
  rentSysvar?: string;
}

interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  uiTokenAmount: UiTokenAmount;
}

interface UiTokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}
interface Status {
  Ok: unknown;
}

interface Transaction {
  message: Message;
  signatures: string[];
}

interface Message {
  accountKeys: AccountKey[];
  instructions: Instruction2[];
  recentBlockhash: string;
}

interface AccountKey {
  pubkey: string;
  signer: boolean;
  writable: boolean;
}

interface Instruction2 {
  accounts?: string[];
  data?: string;
  programId: string;
  parsed?: Parsed2;
  program?: string;
}

interface Parsed2 {
  info: Info2;
  type: string;
}

interface Info2 {
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

interface TokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}
