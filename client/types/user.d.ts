import { Role } from "@/lib/enumTypes";
type IUser = {
  id: string;
  name: string;
  password: string | null;
  email: string;
  email_verified: Date | null;
  role: Role | null;
  image: string | null;
  is_active: boolean;
  surrogate_key: string;
  updated_at: Date;
  created_at: Date;
  deleted_at: Date | null;
};

type IAccount = {
  id: string;
  surrogate_key: string;
  user_id: number;
  is_active: boolean;
  updated_at: Date;
  created_at: Date;
  deleted_at: Date | null;
  type: AccountType;
  provider: string;
  provider_account_id: string | null;
  expires_at: number | null;
  token_type: string | null;
};

type IAppUser = IUser & {
  accounts: IAccount[];
};
